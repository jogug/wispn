const MIMES=["Shy Peek","Happy Hop","Slow Sway","Curious Tilt","Offering Bow","Dizzy Spin","Shiver / Huddle","Orbit Dance"];
const REACTS=["","👋","❤️","😂","😮","👏","🌟","🎉","🤗"];
const TINTS=["#f8fafc","#fda4af","#93c5fd","#86efac","#fde68a"],EYES=["•‿•","◕‿◕","¬‿¬","◉_◉","˘‿˘"],ITEMS=["","🌸","⭐","🍄","🔮","🕯️"],HATS=["","🎩","🌿","👑","🧢","🌙"];
const $=s=>document.querySelector(s);
let sid=location.hash.slice(1)||null, souls=[], beat=0, manifest=null;
function toast(m){$("#toast").textContent=m}
function visitorToken(){let t=localStorage.getItem("wispn_token");if(!t){t=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,"0")).join("");localStorage.setItem("wispn_token",t)}return t}
function hostSecret(){return sid?localStorage.getItem("wispn_host_"+sid):null}
function isHost(){return !!hostSecret()}
function decodePacket(buf){const b=new Uint8Array(buf);if(b.length<10)throw new Error("short packet");const env=b[0],count=b[1],hostGhost=[...b.slice(2,9)],host=b[9]===1;const out=[];for(let i=0;i<count;i++){const o=10+i*12;const dv=new DataView(buf,o,12);out.push({visitor_id:dv.getUint32(0,true),appearance:b[o+4],item_and_hat:b[o+5],mime_seq:[b[o+6],b[o+7],b[o+8]],mime_tempo:b[o+9],host_react:b[o+10]})}return{env,count,hostGhost,host,souls:out}}
const clothState = new Map();
function poseFor(mime, ph) {
  const s = Math.sin(ph), c = Math.cos(ph);
  switch (mime) {
    case 0: return { y: 5 - 3 * Math.max(0, s), rot: -3 * s, sx: 1, sy: .9 + .06 * s, armL: 150 + 40 * Math.max(0, s), armR: 30 - 40 * Math.max(0, s), head: -4 * s, crouch: .12 }; // Shy Peek: arms rise to cover eyes
    case 1: return { y: -12 * Math.abs(s), rot: -6 * s, sx: 1, sy: 1, armL: 160 + 30 * s, armR: 20 - 50 * Math.abs(s), head: 3 * s, crouch: 0 }; // Happy Hop
    case 2: return { y: 0, x: 8 * s, rot: 5 * s, sx: 1, sy: 1, armL: 150 + 12 * s, armR: 30 - 12 * s, head: 5 * s, crouch: 0 }; // Slow Sway
    case 3: return { y: 1, rot: 9 * s, sx: 1.18, sy: 1.18, armL: 140, armR: 40, head: 10 * s, crouch: 0 }; // Curious Tilt: leans in
    case 4: return { y: 6 * Math.max(0, s), rot: 0, sx: 1, sy: .88 + .05 * s, armL: 120, armR: 60, head: 6, crouch: .1 }; // Offering Bow: arms extend forward/down
    case 5: return { y: 0, rot: (ph * 180 / Math.PI) % 360, sx: 1, sy: 1, armL: 170, armR: 10, head: 0, crouch: 0 }; // Dizzy Spin
    case 6: return { y: 2, x: (Math.random() - .5) * 2, rot: 0, sx: .84, sy: .86, armL: 155, armR: 25, head: 0, crouch: .16 }; // Shiver: huddled tremble
    default: return { y: -8 + 6 * c, x: 13 * s, rot: 6 * c, sx: 1, sy: 1, armL: 160 + 25 * c, armR: 20 + 25 * s, head: 4 * c, crouch: 0 }; // Orbit Dance
  }
}
function stepCloth(key, sway, tempo) {
  let pts = clothState.get(key);
  if (!pts) { pts = Array.from({ length: 7 }, (_, i) => ({ y: 74, py: 74, x: 24 + i * 6 })); clothState.set(key, pts); }
  const wind = sway * (0.25 + tempo * 0.08);
  for (const pt of pts) { const vy = (pt.y - pt.py) * 0.92; pt.py = pt.y; pt.y += vy + 0.18 + wind * Math.sin(pt.x * 0.4 + performance.now() * 0.004); const rest = 74; pt.y += (rest - pt.y) * 0.06; }
  for (let k = 0; k < 3; k++) for (let i = 1; i < pts.length; i++) { const mid = (pts[i - 1].y + pts[i].y) / 2; pts[i - 1].y += (mid - pts[i - 1].y) * 0.25; pts[i].y += (mid - pts[i].y) * 0.25; }
  if (clothState.size > 400) clothState.clear();
  return pts;
}
function drawGhost(cv) {
  const s = cv._soul, ctx = cv.getContext("2d"), W = 84, H = 84;
  const speed = [0.4, 0.8, 1.4, 2.2][s.mime_tempo] || 0.8;
  const ph = performance.now() * 0.0022 * speed + (s.visitor_id % 17);
  const mime = s.mime_seq[beat % 3], pose = poseFor(mime, ph);
  ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2 + (pose.x || 0), 44 + (pose.y || 0)); ctx.rotate((pose.rot || 0) * Math.PI / 180); ctx.scale(pose.sx || 1, pose.sy || 1); ctx.translate(-W / 2, -44);
  const pts = stepCloth("g" + s.visitor_id, Math.sin(ph) + (pose.rot || 0) * 0.05, s.mime_tempo);
  const tint = TINTS[(s.appearance >> 4) % 5];
  ctx.beginPath(); ctx.moveTo(24, 76); ctx.lineTo(24, 42);
  ctx.bezierCurveTo(24, 16, 60, 16, 60, 42); ctx.lineTo(60, 76);
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + Math.sin(ph + i) * 1.5);
  ctx.closePath(); ctx.fillStyle = tint; ctx.globalAlpha = 0.95; ctx.fill(); ctx.globalAlpha = 1;
  const drawArm = (side, deg) => { const sx = side < 0 ? 25 : 59, sy = 50, a = deg * Math.PI / 180, ex = sx + side * Math.cos(a) * -14, ey = sy + Math.sin(a) * 12; ctx.strokeStyle = tint; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.beginPath(); ctx.arc(ex, ey, 4, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); };
  drawArm(-1, pose.armL); drawArm(1, pose.armR);
  ctx.save(); ctx.translate(42, 38); ctx.rotate((pose.head || 0) * Math.PI / 180);
  ctx.fillStyle = "#1f2937"; ctx.font = "11px system-ui"; ctx.textAlign = "center"; ctx.fillText(EYES[(s.appearance & 15) % 5], 0, 0); ctx.restore();
  ctx.restore();
  const item = ITEMS[(s.item_and_hat >> 4) % 6]; if (item) { ctx.font = "15px system-ui"; ctx.textAlign = "right"; ctx.fillText(item, 82, 80); }
  const hat = HATS[(s.item_and_hat & 15) % 6]; if (hat) { ctx.font = "14px system-ui"; ctx.textAlign = "center"; ctx.fillText(hat, 42 + (pose.x || 0), 14); }
}
function animateGhosts() { document.querySelectorAll("canvas.ghost-cv").forEach(drawGhost); requestAnimationFrame(animateGhosts); }
function ghostEl(s, hostGhost = false) {
  const d = document.createElement("div"); d.className = "ghost";
  d.innerHTML = `<div class="react">${s.host_react ? REACTS[s.host_react] : ""}</div>`;
  const cv = document.createElement("canvas"); cv.className = "ghost-cv"; cv.width = 84; cv.height = 84; cv._soul = s; d.appendChild(cv);
  const label = document.createElement("small"); label.textContent = hostGhost ? "host" : "#" + s.visitor_id; d.appendChild(label);
  if (!hostGhost) d.onclick = () => openRadial(s);
  return d;
}
function render(){const st=$("#stage");st.className="env-"+(window._env||0);$("#ghosts").replaceChildren(...souls.map(s=>ghostEl(s)));$("#hostGhost").replaceChildren(window._hostGhost?ghostEl({visitor_id:0,appearance:window._hostGhost[0],item_and_hat:window._hostGhost[1],mime_seq:window._hostGhost.slice(2,5),mime_tempo:window._hostGhost[5],host_react:0},true):"");$("#empty").hidden=!!sid;$("#roleBadge").textContent=isHost()?"host":"visitor";$("#roleBadge").classList.toggle("host",isHost());$("#hostBar").hidden=!isHost()}
async function load(){if(!sid){render();return}const h={};const sec=hostSecret();if(sec)h["X-Host-Secret"]=sec;const r=await fetch(`/api/s/${sid}`,{headers:h});if(!r.ok){toast("Sanctuary not found");return}const p=decodePacket(await r.arrayBuffer());window._env=p.env;window._hostGhost=p.hostGhost;souls=p.souls;$("#envSel").value=p.env;render()}
async function createSanctuary(){const secret=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,"0")).join("");const env=+$("#envSel").value||0;const r=await fetch("/api/sanctuaries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({host_secret:secret,env_id:env,host_ghost:[0x01,0,0,1,2,1,0]})});const j=await r.json();if(!r.ok){toast(j.error||"create failed");return}localStorage.setItem("wispn_host_"+j.id,secret);sid=j.id;location.hash=sid;toast("Sanctuary opened: #"+sid);await load()}
function fill(sel,arr){sel.replaceChildren(...arr.map((v,i)=>new Option(v,i)))}
function openRadial(s){if(!isHost()){toast("Only the host can react");return}const box=$("#radial");box.hidden=false;box.replaceChildren(...REACTS.slice(1).map((e,i)=>{const b=document.createElement("button");b.textContent=e;b.onclick=async()=>{await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json","X-Host-Secret":hostSecret()},body:JSON.stringify({action:"react",visitor_id:s.visitor_id,react:i+1})});box.hidden=true;await load()};return b}))}
$("#openBtn").onclick=createSanctuary;$("#shareBtn").onclick=()=>{navigator.clipboard?.writeText(location.href);toast("Link copied")};
$("#summonBtn").onclick=()=>{$("#drawer").hidden=!$("#drawer").hidden};
$("#closeDrawer").onclick=()=>$("#drawer").hidden=true;
$("#envSel").onchange=async()=>{if(isHost())await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json","X-Host-Secret":hostSecret()},body:JSON.stringify({action:"host_update",env_id:+$("#envSel").value})});await load()};
$("#doSummon").onclick=async()=>{if(!sid){toast("Open a sanctuary first");return}const body={action:"summon",visitor_token:visitorToken(),appearance:((+$("#fTint").value)<<4)|(+$("#fEyes").value),item_and_hat:((+$("#fItem").value)<<4)|(+$("#fHat").value),mime_seq:[+$("#fBeat0").value,+$("#fBeat1").value,+$("#fBeat2").value],mime_tempo:+$("#fTempo").value};const r=await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();toast(r.ok?`Summoned! ${souls.length+1}/100 souls`:(j.error||"failed"));await load()};
addEventListener("hashchange",()=>{sid=location.hash.slice(1)||null;load()});
(async()=>{fill($("#fTint"),TINTS.map((_,i)=>"Tint "+i));fill($("#fEyes"),EYES);fill($("#fItem"),ITEMS.map((v,i)=>v||"None"));fill($("#fHat"),HATS.map((v,i)=>v||"None"));["#fBeat0","#fBeat1","#fBeat2"].forEach((s,i)=>{fill($(s),MIMES);$(s).value=i});$("#particles").replaceChildren(...Array.from({length:24},()=>{const e=document.createElement("i");e.style.left=Math.random()*100+"%";e.style.animationDelay=Math.random()*7+"s";return e}));try{manifest=await(await fetch("/assets/manifest.json")).json()}catch{} requestAnimationFrame(animateGhosts);setInterval(()=>{beat++;render()},1200);setInterval(load,5000);await load()})();
