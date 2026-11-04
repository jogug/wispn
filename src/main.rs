use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use dashmap::DashMap;
use serde::Deserialize;
use std::{collections::VecDeque, sync::Arc, time::{SystemTime, UNIX_EPOCH}};
use tower_http::services::{ServeDir, ServeFile};

// SoulRecord wire layout, exactly 12 bytes per ghost.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct SoulRecord { pub visitor_id: u32, pub appearance: u8, pub item_and_hat: u8, pub mime_seq: [u8; 3], pub mime_tempo: u8, pub host_react: u8, pub padding: u8 }
impl SoulRecord {
    pub fn to_bytes(&self) -> [u8; 12] { let mut b = [0u8; 12]; b[0..4].copy_from_slice(&self.visitor_id.to_le_bytes()); b[4] = self.appearance; b[5] = self.item_and_hat; b[6..9].copy_from_slice(&self.mime_seq); b[9] = self.mime_tempo; b[10] = self.host_react; b[11] = self.padding; b }
    pub fn from_bytes(b: &[u8]) -> Option<Self> { if b.len() < 12 { return None; } Some(Self { visitor_id: u32::from_le_bytes(b[0..4].try_into().ok()?), appearance: b[4], item_and_hat: b[5], mime_seq: [b[6], b[7], b[8]], mime_tempo: b[9], host_react: b[10], padding: b[11] }) }
}

pub struct Sanctuary { pub last_active: u32, pub env_id: u8, pub host_ghost: [u8; 7], pub souls: VecDeque<SoulRecord> }
type Store = Arc<DashMap<u64, Sanctuary>>;
fn now() -> u32 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as u32 }
pub fn derive_id(host_secret: &[u8]) -> u64 { u64::from_le_bytes(blake3::hash(host_secret).as_bytes()[0..8].try_into().unwrap()) }
pub fn visitor_id(token: &[u8]) -> u32 { u32::from_le_bytes(blake3::hash(token).as_bytes()[0..4].try_into().unwrap()) }
fn parse_hex(s: &str) -> Option<Vec<u8>> { if s.len() % 2 != 0 { return None; } (0..s.len()).step_by(2).map(|i| u8::from_str_radix(&s[i..i + 2], 16).ok()).collect() }
fn is_host(headers: &HeaderMap, id: u64) -> bool { headers.get("x-host-secret").and_then(|v| v.to_str().ok()).and_then(|s| parse_hex(s)).map(|b| derive_id(&b) == id).unwrap_or(false) }
fn valid_mime(v: u8) -> bool { v < 8 }

// GET packet: [env_id, count, host_ghost(7), pad, souls * 12] = 10 + count*12
async fn get_sanctuary(State(store): State<Store>, Path(id_hex): Path<String>, headers: HeaderMap) -> impl IntoResponse {
    let Ok(id) = u64::from_str_radix(&id_hex, 16) else { return (StatusCode::BAD_REQUEST, Vec::new()); };
    let Some(mut s) = store.get_mut(&id) else { return (StatusCode::NOT_FOUND, Vec::new()); };
    s.last_active = now();
    let host = is_host(&headers, id);
    let mut out = Vec::with_capacity(10 + s.souls.len() * 12);
    out.push(s.env_id.min(5)); out.push(s.souls.len() as u8); out.extend_from_slice(&s.host_ghost); out.push(if host { 1 } else { 0 });
    for soul in &s.souls { out.extend_from_slice(&soul.to_bytes()); }
    (StatusCode::OK, out)
}

#[derive(Deserialize)]
struct CreateReq { host_secret: String, #[serde(default)] env_id: u8, #[serde(default)] host_ghost: [u8; 7] }
async fn create_sanctuary(State(store): State<Store>, Json(r): Json<CreateReq>) -> impl IntoResponse {
    let Some(secret) = parse_hex(&r.host_secret) else { return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"host_secret must be hex"}))); };
    if secret.len() != 16 { return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"host_secret must be 16 bytes (128-bit)"}))); }
    let id = derive_id(&secret);
    store.entry(id).or_insert_with(|| Sanctuary { last_active: now(), env_id: r.env_id.min(5), host_ghost: r.host_ghost, souls: VecDeque::new() });
    if let Some(mut s) = store.get_mut(&id) { s.last_active = now(); s.env_id = r.env_id.min(5); if r.host_ghost != [0; 7] { s.host_ghost = r.host_ghost; } }
    (StatusCode::OK, Json(serde_json::json!({"id": format!("{id:016x}"), "id_u64": id.to_string()})))
}

#[derive(Deserialize)]
struct PostReq { action: String, #[serde(default)] visitor_token: String, #[serde(default)] appearance: u8, #[serde(default)] item_and_hat: u8, #[serde(default)] mime_seq: [u8; 3], #[serde(default = "default_tempo")] mime_tempo: u8, #[serde(default)] visitor_id: u32, #[serde(default)] hair: u8, #[serde(default)] react: u8, #[serde(default)] env_id: Option<u8>, #[serde(default)] host_ghost: Option<[u8; 7]> }
fn default_tempo() -> u8 { 1 }

async fn post_sanctuary(State(store): State<Store>, Path(id_hex): Path<String>, headers: HeaderMap, Json(r): Json<PostReq>) -> impl IntoResponse {
    let Ok(id) = u64::from_str_radix(&id_hex, 16) else { return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"bad id"}))); };
    match r.action.as_str() {
        "summon" => {
            if !r.mime_seq.iter().all(|&v| valid_mime(v)) { return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"mime_seq values must be 0..7"}))); }
            let Some(mut s) = store.get_mut(&id) else { return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"sanctuary not found"}))); };
            let vid = if !r.visitor_token.is_empty() { visitor_id(r.visitor_token.as_bytes()) } else if r.visitor_id != 0 { r.visitor_id } else { return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"visitor_token required"}))); };
            let rec = SoulRecord { visitor_id: vid, appearance: r.appearance, item_and_hat: r.item_and_hat, mime_seq: r.mime_seq, mime_tempo: r.mime_tempo.min(3), host_react: 0, padding: r.hair };
            if let Some(pos) = s.souls.iter().position(|x| x.visitor_id == vid) { s.souls[pos] = rec; } else { s.souls.push_back(rec); while s.souls.len() > 100 { s.souls.pop_front(); } }
            s.last_active = now();
            (StatusCode::OK, Json(serde_json::json!({"ok":true,"visitor_id":vid,"count":s.souls.len()})))
        }
        "react" => {
            if !is_host(&headers, id) { return (StatusCode::FORBIDDEN, Json(serde_json::json!({"error":"host only"}))); }
            if !(1..=8).contains(&r.react) { return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"react must be 1..8"}))); }
            let Some(mut s) = store.get_mut(&id) else { return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"sanctuary not found"}))); };
            let Some(soul) = s.souls.iter_mut().find(|x| x.visitor_id == r.visitor_id) else { return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"soul not found"}))); };
            soul.host_react = r.react; s.last_active = now();
            (StatusCode::OK, Json(serde_json::json!({"ok":true})))
        }
        "host_update" => {
            if !is_host(&headers, id) { return (StatusCode::FORBIDDEN, Json(serde_json::json!({"error":"host only"}))); }
            let Some(mut s) = store.get_mut(&id) else { return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"sanctuary not found"}))); };
            if let Some(e) = r.env_id { s.env_id = e.min(5); }
            if let Some(h) = r.host_ghost { s.host_ghost = h; }
            s.last_active = now();
            (StatusCode::OK, Json(serde_json::json!({"ok":true})))
        }
        _ => (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"unknown action"}))),
    }
}

async fn health() -> impl IntoResponse { (StatusCode::OK, [(header::CONTENT_TYPE, "application/json")], "{\"ok\":true}") }

#[tokio::main]
async fn main() {
    let store: Store = Arc::new(DashMap::new());
    let cleanup = store.clone();
    tokio::spawn(async move { let mut t = tokio::time::interval(std::time::Duration::from_secs(3600)); loop { t.tick().await; let cutoff = now().saturating_sub(30 * 24 * 3600); cleanup.retain(|_, s: &mut Sanctuary| s.last_active > cutoff); } });
    let app = Router::new()
        .route("/health", get(health))
        .route("/api/sanctuaries", post(create_sanctuary))
        .route("/api/s/:id", get(get_sanctuary).post(post_sanctuary))
        .fallback_service(ServeDir::new("public").append_index_html_on_directories(true).fallback(ServeFile::new("public/index.html")))
        .with_state(store);
    let port: u16 = std::env::var("PORT").ok().and_then(|v| v.parse().ok()).unwrap_or(3000);
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await.unwrap();
    println!("wispn listening on http://0.0.0.0:{port}");
    axum::serve(listener, app).await.unwrap();
}
