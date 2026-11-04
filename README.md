# wispn — Pantom (Anonymous Ghost-Mime Sanctuary)

Zero-signup ghost-mime toy. Rust (axum + DashMap + BLAKE3) backend, vanilla JS frontend.
Each sanctuary holds the last 100 visitor souls in a FIFO buffer (12 bytes per soul on the wire).

## Run

```sh
export PATH=/tmp/cargo/bin:$PATH RUSTUP_HOME=/tmp/rustup CARGO_HOME=/tmp/cargo
cargo run --release   # or: cargo build --release && ./target/release/wispn
# PORT=8080 ./target/release/wispn
```

Open http://localhost:3000 in a browser. Click **Open Sanctuary**, share the `#<id>` link, visitors summon ghosts.

## Wire protocol

`GET /api/s/:id` (id = 16-hex u64) returns a binary packet: `[env_id, count, host_ghost(7), is_host, souls * 12]`.
Each soul is 12 bytes: `visitor_id u32 LE, appearance, item_and_hat, mime_seq[3], mime_tempo, host_react, padding`.
Appearance packs tint (high nibble) and eye style (low nibble). Item/hat pack the same way.

`POST /api/sanctuaries` with `{"host_secret":"<32 hex chars = 128-bit>", "env_id":0}` returns `{"id":"<16 hex>"}` where `id = u64 LE of BLAKE3(host_secret)[0..8]`.
Send `X-Host-Secret: <hex>` to prove host rights. No accounts, no database.

`POST /api/s/:id` actions: `summon` (visitor_token + appearance + mime_seq), `react` (host only, visitor_id + react 1..8), `host_update` (host only, env_id / host_ghost).

Sanctuaries idle for 30 days are evicted by an hourly background task.

## Layout

`src/main.rs` is the whole backend. `public/` is the frontend (`index.html`, `app.js`, `style.css`, `assets/manifest.json` + SVG ghost parts). Swap SVGs in `public/assets/ghost/` to re-skin ghosts without code changes.
