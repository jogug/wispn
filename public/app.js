const MIMES=["Shy Peek","Happy Hop","Slow Sway","Curious Tilt","Offering Bow","Joyful Twirl","Cozy Huddle","Playful Orbit"];
const TINTS=["#f8fafc","#fda4af","#93c5fd","#86efac","#fde68a"],EYE_NAMES=["Soft Wonder","Happy Arc","Wide Curious","Peaceful Slumber","Cozy Starry"],ITEMS=["","🌸","⭐","🍄","🔮","🕯️"],HATS=["","🎩","🌿","👑","🧢","🌙"];
const SEG=[14,15,16,16],RAD=[26,28,25,20,12],ENV_WIND=[.12,.05,.3,.8,.5,.35],ENV_DAMP=[.90,.94,.84,.92,.9,.88],PART_N=[45,50,60,70,80,55];
const $=s=>document.querySelector(s),stage=$("#stage"),canvas=$("#world");let ctx=canvas.getContext("2d");
let sid=location.hash.slice(1)||null,souls=[],wisps=new Map(),hostWisp=null,beat=0,beatT=0,mouse={x:-999,y:-999},particles=[],pair=null,orbs=[],dragWisp=null,eyeImgs=[],itemImgs=[],hatImgs=[];
function toast(m){$("#toast").textContent=m}
function visitorToken(){let t=localStorage.getItem("wispn_token");if(!t){t=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,"0")).join("");localStorage.setItem("wispn_token",t)}return t}
function myVid(){return +(localStorage.getItem("wispn_my_vid")||0)}
function hostSecret(){return sid?localStorage.getItem("wispn_host_"+sid):null}
function isHost(){return !!hostSecret()}
function decodePacket(buf){const b=new Uint8Array(buf);if(b.length<10)throw new Error("short packet");const out=[];for(let i=0;i<b[1];i++){const o=10+i*12,outv=new DataView(buf,o,12);out.push({visitor_id:outv.getUint32(0,true),appearance:b[o+4],item_and_hat:b[o+5],mime_seq:[b[o+6],b[o+7],b[o+8]],mime_tempo:b[o+9],host_react:b[o+10]})}return{env:b[0],hostGhost:[...b.slice(2,9)],souls:out}}
function loadImgs(paths){return paths.map(p=>{const i=new Image();i.src=p;return i})}
function makeWisp(soul,x,y,scale=1){return{soul,x,y,scale,nodes:Array.from({length:5},(_,i)=>({x,y:y+i*15,px:x,py:y+i*15})),gaze:{x:0,y:0,tx:0,ty:0},blink:2+Math.random()*3,blinkPh:0,hatSpring:{y:0,v:0},pend:0,pendV:0,phase:Math.random()*7,rip:0}}
function syncWisps(){const W=canvas.clientWidth,H=canvas.clientHeight;souls.forEach((s,i)=>{if(!wisps.has(s.visitor_id)){const x=60+(i%10)*(W-120)/9,y=90+Math.floor(i/10)*90;wisps.set(s.visitor_id,makeWisp(s,x,y))}else wisps.get(s.visitor_id).soul=s});for(const k of [...wisps.keys()])if(!souls.find(s=>s.visitor_id===k))wisps.delete(k);
 if(window._hostGhost){const hg={visitor_id:0,appearance:window._hostGhost[0],item_and_hat:window._hostGhost[1],mime_seq:window._hostGhost.slice(2,5),mime_tempo:window._hostGhost[5],host_react:0};if(!hostWisp)hostWisp=makeWisp(hg,W/2,110,1.15);hostWisp.soul=hg}}
function ik(sx,sy,tx,ty,l1,l2,bend){const dx=tx-sx,dy=ty-sy;let d=Math.hypot(dx,dy);d=Math.min(d,l1+l2-.01);const a=Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d)))),base=Math.atan2(dy,dx),ea=base+bend*a;return{ex:sx+Math.cos(ea)*l1,ey:sy+Math.sin(ea)*l1,hx:sx+Math.cos(base)*d,hy:sy+Math.sin(base)*d}}
function pose(w,t){const s=w.soul,m=s.mime_seq[beat%3],ph=t*(0.9+s.mime_tempo*.45)+w.phase,sn=Math.sin(ph),cs=Math.cos(ph);const base={ox:0,oy:0,rot:0,sx:1,sy:1,seg:1,blush:.35,handL:[-24,18],handR:[24,18],headTilt:0};
 if(m===0)return{...base,oy:4-3*Math.max(0,sn),handL:[-7,-6],handR:[7,sn>0?-6:4],blush:sn>0?.75:.4,headTilt:-4*sn};
 if(m===1)return{...base,oy:-22*Math.abs(sn),handL:[-22,-34],handR:[22,-34],sy:1+.08*Math.abs(cs)};
 if(m===2)return{...base,ox:18*sn,rot:5*sn,handL:[0,8],handR:[0,8],headTilt:6*sn};
 if(m===3)return{...base,ox:8*sn,rot:16,headTilt:28,handL:[-8,4],handR:[26,22]};
 if(m===4)return{...base,oy:14*Math.max(0,sn),rot:12,handL:[-10,12],handR:[10,12],headTilt:8};
 if(m===5){const tw=cs;return{...base,sx:Math.abs(tw)*.9+.25,flare:1.25,handL:[-28,0],handR:[28,0],rot:8*sn}}
 if(m===6)return{...base,seg:.72,ox:(Math.random()-.5)*3,handL:[14,-2],handR:[-14,-2],sy:.9};
 return{...base,ox:26*sn,oy:-10+14*cs,rot:18*cs,handL:[-28,-8],handR:[28,-8]}}
function stepWisp(w,t,dt){const p=pose(w,t),home=w.fly?null:{x:w.homeX+(p.ox||0)*w.scale,y:w.homeY+(p.oy||0)*w.scale};let tx,ty;
 if(w.fly){const f=w.fly,e=Math.min(1,(performance.now()-f.t0)/850),ee=e<.5?2*e*e:1-Math.pow(-2*e+2,2)/2;tx=f.x0+(f.cx-f.x0)*ee+(f.x1-f.cx)*ee*ee;ty=f.y0+(f.cy-f.y0)*ee+(f.y1-f.cy)*ee*ee - Math.sin(ee*Math.PI)*24;if(e>=1){w.state="INTERACTING";w.fly=null;if(pair)pair.since=performance.now()}}else if(dragWisp===w){tx=mouse.x;ty=mouse.y}else{tx=home.x;ty=home.y}
 const n=w.nodes,k=w.scale,damp=ENV_DAMP[window._env||0];
 const vx=(tx-n[0].x)*.08,vy=(ty-n[0].y)*.08;n[0].px=n[0].x;n[0].py=n[0].y;n[0].x+=vx;n[0].y+=vy;
 for(let i=1;i<5;i++){const nd=n[i],pvx=(nd.x-nd.px)*damp,pvy=(nd.y-nd.py)*damp;nd.px=nd.x;nd.py=nd.y;nd.x+=pvx+ENV_WIND[window._env||0]*.06*Math.sin(t*1.3+i);nd.y+=pvy+.12}
 for(let it=0;it<3;it++)for(let i=1;i<5;i++){const a=n[i-1],b=n[i],want=SEG[i-1]*k*(p.seg||1);let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;const diff=(d-want)/d;b.x-=dx*diff*(i===1?.2:.5);b.y-=dy*diff*(i===1?.2:.5);
  if(i>1){const pa=Math.atan2(n[i-1].y-n[i-2].y,n[i-1].x-n[i-2].x);let ca=Math.atan2(b.y-a.y,b.x-a.x),dd=ca-pa;while(dd>Math.PI)dd-=2*Math.PI;while(dd<-Math.PI)dd+=2*Math.PI;const lim=32*Math.PI/180;if(Math.abs(dd)>lim){ca=pa+Math.sign(dd)*lim;b.x=a.x+Math.cos(ca)*want;b.y=a.y+Math.sin(ca)*want}}}
 w.pose=p;
 // gaze priority: interaction > cursor 220 > neighbor 130 > particle saccade
 let gx=0,gy=0;const cx=n[0].x,cy=n[0].y;
 if(w.state==="INTERACTING"&&pair){const o=pair.a===w?pair.b:pair.a;gx=o.nodes[0].x-cx;gy=o.nodes[0].y-cy}
 else if(Math.hypot(mouse.x-cx,mouse.y-cy)<220){gx=mouse.x-cx;gy=mouse.y-cy;w.pose.headTilt=(w.pose.headTilt||0)+8*Math.sign(gx)*.1}
 else{let best=1e9,bo=null;for(const o of allWisps()){if(o!==w){const d=Math.hypot(o.nodes[0].x-cx,o.nodes[0].y-cy);if(d<best){best=d;bo=o}}}if(best<130&&bo){gx=bo.nodes[0].x-cx;gy=bo.nodes[0].y-cy}else{w.sacc=(w.sacc||0)-dt;if(w.sacc<=0){w.sacc=1.8+Math.random()*2.7;const pt=particles[Math.floor(Math.random()*particles.length)];if(pt){gx=pt.x-cx;gy=pt.y-cy}}}}
 const gl=Math.hypot(gx,gy)||1;w.gaze.tx=Math.max(-8,Math.min(8,gx/gl*8));w.gaze.ty=Math.max(-5,Math.min(5,gy/gl*5));w.gaze.x+=(w.gaze.tx-w.gaze.x)*.12;w.gaze.y+=(w.gaze.ty-w.gaze.y)*.12;
 w.blink-=dt;if(w.blink<=0){w.blink=3.2+Math.random()*2.8;w.blinkPh=performance.now()}
 // hat spring stiffness 180 damping 12
 const hs=w.hatSpring;hs.v+=(-180*hs.y-12*hs.v)*dt;hs.y+=hs.v*dt;if(Math.abs(vy)>2)hs.v+=vy*.4;
 const targetPend=Math.max(-.8,Math.min(.8,-vx*.06));w.pendV+=(targetPend-w.pend)*.08;w.pend+=w.pendV;w.pendV*=.92}
function allWisps(){return hostWisp?[...wisps.values(),hostWisp]:[...wisps.values()]}
function contour(w){const n=w.nodes,k=w.scale,p=w.pose||{},pts=[];const breath=1+Math.sin(performance.now()*.0015+w.phase)*.05;
 for(let i=0;i<5;i++){const a=n[Math.max(0,i-1)],b=n[Math.min(4,i+1)];let tx=b.x-a.x,ty=b.y-a.y;const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;const r=RAD[i]*k*(i===1?breath:1)*(p.flare&&i>2?p.flare:1);pts.push({lx:n[i].x-ty*r,ly:n[i].y+tx*r,rx:n[i].x+ty*r,ry:n[i].y-tx*r})}
 const t=performance.now()*.006,hem=[];for(let i=0;i<5;i++){const f=i/4,x=pts[4].lx+(pts[4].rx-pts[4].lx)*f,y=pts[4].ly+(pts[4].ry-pts[4].ly)*f+Math.sin(t+i*1.5+(w.nodes[0].x)*.02)*3.5;hem.push({x,y})}return{pts,hem}}
function smoothPath(points){let d=`M ${points[0].x} ${points[0].y}`;for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];d+=` C ${p1.x+(p2.x-p0.x)/6} ${p1.y+(p2.y-p0.y)/6}, ${p2.x-(p3.x-p1.x)/6} ${p2.y-(p3.y-p1.y)/6}, ${p2.x} ${p2.y}`}return d}
function drawWisp(w,t){const s=w.soul,k=w.scale,n=w.nodes,p=w.pose||pose(w,t),{pts,hem}=contour(w);const path=new Path2D(smoothPath([pts[0].r||{x:pts[0].rx,y:pts[0].ry},...pts.map(q=>({x:q.rx,y:q.ry})),...hem,...pts.map(q=>({x:q.lx,y:q.ly})).reverse()]));
 const tint=TINTS[(s.appearance>>4)%5];
 ctx.save();ctx.globalCompositeOperation="screen";const au=ctx.createRadialGradient(n[0].x,n[0].y,4,n[0].x,n[0].y,65*k);au.addColorStop(0,tint);au.addColorStop(1,"transparent");ctx.globalAlpha=.15+.15*Math.sin(t*2*Math.PI*.8+w.phase);ctx.fillStyle=au;ctx.beginPath();ctx.arc(n[0].x,n[0].y,65*k,0,7);ctx.fill();ctx.restore();
 const shoulder=(side)=>({x:n[1].x+side*20*k,y:n[1].y-2*k});
 const handWorld=(h)=>({x:n[0].x+h[0]*k,y:n[0].y+h[1]*k});
 const drawArm=(side,target,onTop)=>{const sh=shoulder(side),sol=ik(sh.x,sh.y,target.x,target.y,17*k,15*k,side);ctx.strokeStyle=tint;ctx.lineCap="round";ctx.lineWidth=8*k;ctx.beginPath();ctx.moveTo(sh.x,sh.y);ctx.lineTo(sol.ex,sol.ey);ctx.lineTo(sol.hx,sol.hy);ctx.stroke();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(sol.hx,sol.hy,5*k,0,7);ctx.fill();return sol};
 const backSide=w.gaze.x>=0?1:-1;drawArm(backSide,handWorld(backSide>0?p.handR:p.handL),false);
 ctx.fillStyle="#1a162b";ctx.globalAlpha=.45;ctx.beginPath();ctx.ellipse((hem[0].x+hem[4].x)/2,hem[2].y,22*k,7*k,0,0,7);ctx.fill();ctx.globalAlpha=1;
 const grad=ctx.createLinearGradient(n[0].x,n[0].y-26*k,n[4].x,n[4].y);grad.addColorStop(0,tint);grad.addColorStop(1,tint+"66");ctx.globalAlpha=.95;ctx.fillStyle=grad;ctx.fill(path);ctx.globalAlpha=1;
 const blinkAge=(performance.now()-w.blinkPh)/140,blinkScale=blinkAge<1?Math.abs(Math.cos(blinkAge*Math.PI))*.95+.05:1;
 ctx.save();ctx.translate(n[0].x+w.gaze.x*k,n[0].y-4*k+w.gaze.y*k);ctx.fillStyle="rgba(244,114,182,.35)";ctx.beginPath();ctx.ellipse(-14*k,7*k,10*k,6*k,0,0,7);ctx.ellipse(14*k,7*k,10*k,6*k,0,0,7);ctx.fill();
 const eyeImg=eyeImgs[(s.appearance&15)%5];ctx.save();ctx.scale(w.gaze.x>5?.82:1,blinkScale);if(eyeImg&&eyeImg.complete)ctx.drawImage(eyeImg,-20*k,-9*k,40*k,18*k);else{ctx.fillStyle="#1f2937";ctx.font=`${12*k}px system-ui`;ctx.textAlign="center";ctx.fillText("• ‿ •",0,4*k)}ctx.restore();ctx.restore();
 const hatIdx=(s.item_and_hat&15)%6;if(hatIdx){ctx.save();ctx.translate(n[0].x-w.gaze.x*.2*k,n[0].y-24*k+w.hatSpring.y);ctx.rotate((p.headTilt||0)*Math.PI/180*.4-w.gaze.x*.015);const hi=hatImgs[hatIdx-1];ctx.font=`${22*k}px system-ui`;ctx.textAlign="center";if(hi&&hi.complete)ctx.drawImage(hi,-13*k,-22*k,26*k,26*k);else ctx.fillText(HATS[hatIdx],0,0);ctx.restore()}
 const frontSol=drawArm(-backSide,handWorld(backSide>0?p.handL:p.handR),true);
 const itemIdx=(s.item_and_hat>>4)%6;if(itemIdx){const dangles=itemIdx>=4;ctx.save();ctx.translate(frontSol.hx,frontSol.hy);ctx.rotate(dangles?w.pend:(Math.atan2(frontSol.hy-frontSol.ey,frontSol.hx-frontSol.ex)+.78));const ii=itemImgs[itemIdx-1];if(ii&&ii.complete)ctx.drawImage(ii,-11*k,0,22*k,22*k);else{ctx.font=`${16*k}px system-ui`;ctx.textAlign="center";ctx.fillText(ITEMS[itemIdx],0,14*k)}ctx.restore();
  if(itemIdx>=4){ctx.save();ctx.globalCompositeOperation="screen";ctx.fillStyle="rgba(251,191,36,.25)";ctx.beginPath();ctx.arc(frontSol.hx,frontSol.hy+10*k,16*k,0,7);ctx.fill();ctx.restore()}}
 ctx.strokeStyle="rgba(255,255,255,.6)";ctx.lineWidth=2.5*k;ctx.beginPath();ctx.arc(n[0].x,n[0].y,24*k,Math.PI*1.05,Math.PI*1.55);ctx.stroke();
 if(s.host_react){const a=t*1.2+s.visitor_id;ctx.fillStyle="#fde68a";ctx.font="13px system-ui";ctx.textAlign="center";ctx.fillText("✦",n[0].x+Math.cos(a)*30*k,n[0].y-18*k+Math.sin(a)*8*k)}
 if(w.rip>0){ctx.strokeStyle=`rgba(255,255,255,${w.rip})`;ctx.beginPath();ctx.arc(n[0].x,n[0].y,(1-w.rip)*44+12,0,7);ctx.stroke()}}
function makeParticles(){const n=PART_N[window._env||0];particles=Array.from({length:n},()=>({x:Math.random()*canvas.clientWidth,y:Math.random()*canvas.clientHeight,s:.5+Math.random()*2,v:.2+Math.random()*.8,ph:Math.random()*7}))}
function drawEnv(t){const W=canvas.clientWidth,H=canvas.clientHeight,e=window._env||0;const skies=[["#071714","#13382e","#0a2019"],["#fdf6f0","#f7d6e0","#c8d9f8"],["#16697a","#0b3a54","#061a2e"],["#140d26","#8c3b2b","#d97f38"],["#0f203c","#4b3d60","#e8f1fc"],["#ff6b6b","#feca57","#2e1f47"]][e];const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,skies[0]);g.addColorStop(.55,skies[1]);g.addColorStop(1,skies[2]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="rgba(255,255,255,.75)";if(e===3||e===4)for(let i=0;i<50;i++)ctx.fillRect((i*97)%W,(i*57)%(H*.5),1.6,1.6);
 if(e===3){ctx.fillStyle="#fef3c7";ctx.beginPath();ctx.arc(W*.82,H*.16,26,0,7);ctx.fill()}
 if(e===1){ctx.save();ctx.globalAlpha=.14;ctx.fillStyle="#fff";for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(W*(.15+i*.25),0);ctx.lineTo(W*(.3+i*.25),0);ctx.lineTo(W*(.45+i*.25),H);ctx.lineTo(W*(.2+i*.25),H);ctx.fill()}ctx.restore()}
 if(e===4){ctx.strokeStyle="rgba(110,231,183,.55)";ctx.lineWidth=10;ctx.beginPath();for(let x=0;x<=W;x+=16)ctx.lineTo(x,40+Math.sin(x*.012+t)*16);ctx.stroke()}
 if(e===2){ctx.strokeStyle="rgba(125,211,252,.16)";for(let i=0;i<24;i++){ctx.beginPath();ctx.arc((i*83)%W,(i*37)%(H*.33),18+((i*13)%22),0,7);ctx.stroke()}}
 ctx.fillStyle="rgba(0,0,0,.28)";ctx.beginPath();ctx.moveTo(0,H);if(e===3){ctx.lineTo(0,H*.72);ctx.bezierCurveTo(W*.3,H*.58,W*.6,H*.8,W,H*.66)}else if(e===5){ctx.lineTo(0,H*.8);ctx.bezierCurveTo(W*.3,H*.74+Math.sin(t*.8)*7,W*.7,H*.84,W,H*.78)}else{ctx.lineTo(0,H*.78);ctx.lineTo(W*.18,H*.62);ctx.lineTo(W*.38,H*.78);ctx.lineTo(W*.62,H*.6);ctx.lineTo(W*.84,H*.76);ctx.lineTo(W,H*.64)}ctx.lineTo(W,H);ctx.fill();
 for(const pt of particles){pt.y+= (e===4? pt.v*1.4 : e===0||e===2? -pt.v : pt.v*.35);pt.x+=Math.sin(t+pt.ph)*.4+(e===3?1.1:e===5?.3:0);if(pt.y<0)pt.y=H;if(pt.y>H)pt.y=0;if(pt.x>W)pt.x=0;ctx.fillStyle=e===0?"rgba(255,203,107,.9)":e===2?"rgba(186,230,253,.65)":"rgba(255,255,255,.8)";ctx.beginPath();ctx.arc(pt.x,pt.y,pt.s,0,7);ctx.fill()}
 ctx.fillStyle="rgba(0,0,0,.18)";ctx.fillRect(0,H-46,W,46);
 if(e===5){ctx.strokeStyle="rgba(125,211,252,.7)";ctx.beginPath();for(let x=0;x<=W;x+=14)ctx.lineTo(x,H-38+Math.sin(x*.05+t*1.26)*4);ctx.stroke()}
 const vg=ctx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.85);vg.addColorStop(0,"transparent");vg.addColorStop(1,"rgba(0,0,0,.32)");ctx.fillStyle=vg;ctx.fillRect(0,0,W,H)}
let lastT=0;
function frame(now){const t=now/1000,dt=Math.min(.05,(now-lastT)/1000||.016);lastT=now;beatT+=dt;if(beatT>=1.2){beatT=0;beat++}
 if(canvas.clientWidth&&canvas.width!==canvas.clientWidth*devicePixelRatio){canvas.width=canvas.clientWidth*devicePixelRatio;canvas.height=canvas.clientHeight*devicePixelRatio}
 ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);drawEnv(t);
 const list=allWisps().sort((a,b)=>a.nodes[0].y-b.nodes[0].y);for(const w of list){if(!w.homeX){w.homeX=w.nodes[0].x;w.homeY=w.nodes[0].y}stepWisp(w,t,dt);if(w.rip>0)w.rip-=.02;drawWisp(w,t)}
 if(pair&&orbs.length){for(const o of orbs){o.y+=Math.sin(t*2+o.i)*.3;ctx.fillStyle="rgba(253,224,171,.92)";ctx.beginPath();ctx.arc(o.x,o.y,15,0,7);ctx.fill();ctx.fillStyle="#7c2d12";ctx.font="13px system-ui";ctx.textAlign="center";ctx.fillText(o.icon,o.x,o.y+5)}}
 requestAnimationFrame(frame)}
async function load(){if(!sid){$("#empty").hidden=false;return}$("#empty").hidden=true;const h={};const sec=hostSecret();if(sec)h["X-Host-Secret"]=sec;const r=await fetch(`/api/s/${sid}`,{headers:h});if(!r.ok){toast("Sanctuary not found");return}const p=decodePacket(await r.arrayBuffer());window._env=p.env;window._hostGhost=p.hostGhost;souls=p.souls;syncWisps();makeParticles();$("#roleBadge").textContent=isHost()?"host":"visitor";$("#roleBadge").classList.toggle("host",isHost());$("#envWrap").hidden=!isHost();$("#envSel").value=p.env}
async function createSanctuary(){const secret=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,"0")).join("");const r=await fetch("/api/sanctuaries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({host_secret:secret,env_id:0,host_ghost:[0x01,0,0,1,2,1,0]})});const j=await r.json();if(!r.ok){toast(j.error||"create failed");return}localStorage.setItem("wispn_host_"+j.id,secret);sid=j.id;location.hash=sid;await load();openLimbo()}
function currentSoul(){return{visitor_id:myVid()||999999,appearance:((+$("#fTint").value)<<4)|(+$("#fEyes").value),item_and_hat:((+$("#fItem").value)<<4)|(+$("#fHat").value),mime_seq:[+$("#fBeat0").value,+$("#fBeat1").value,+$("#fBeat2").value],mime_tempo:+$("#fTempo").value,host_react:0}}
let heroWisp=null;
function openLimbo(){$("#limbo").hidden=false;$("#envWrap").hidden=!isHost();heroWisp=makeWisp(currentSoul(),180,180,2);heroWisp.homeX=180;heroWisp.homeY=180;drawHero()}
function drawHero(){if($("#limbo").hidden||!heroWisp)return;const hctx=$("#hero").getContext("2d");heroWisp.soul=currentSoul();heroWisp.gaze.tx=Math.max(-8,Math.min(8,(mouse.x-180)*.04));heroWisp.gaze.ty=Math.max(-5,Math.min(5,(mouse.y-180)*.04));stepWisp(heroWisp,performance.now()/1000,.016);hctx.clearRect(0,0,360,360);const g=hctx.createRadialGradient(180,150,20,180,180,220);g.addColorStop(0,"#2e2450");g.addColorStop(1,"#0d0a1a");hctx.fillStyle=g;hctx.fillRect(0,0,360,360);const worldCtx=ctx;ctx=hctx;drawWisp(heroWisp,performance.now()/1000);ctx=worldCtx;requestAnimationFrame(drawHero)}
async function release(){if(!sid){toast("Open a sanctuary first");return}const limbo=$("#limbo");limbo.classList.add("crossing");const body={action:"summon",visitor_token:visitorToken(),appearance:currentSoul().appearance,item_and_hat:currentSoul().item_and_hat,mime_seq:currentSoul().mime_seq,mime_tempo:currentSoul().mime_tempo};const r=await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(r.ok)localStorage.setItem("wispn_my_vid",j.visitor_id);if(isHost())await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json","X-Host-Secret":hostSecret()},body:JSON.stringify({action:"host_update",env_id:+$("#envSel").value})});setTimeout(async()=>{limbo.hidden=true;limbo.classList.remove("crossing");toast(r.ok?"Released into sanctuary":"Summon failed");await load()},1100)}
function flyTo(a,b){const dir=b.nodes[0].x>=a.nodes[0].x?1:-1;a.fly={t0:performance.now()+120,x0:a.nodes[0].x,y0:a.nodes[0].y,cx:(a.nodes[0].x+b.nodes[0].x)/2,cy:Math.min(a.nodes[0].y,b.nodes[0].y)-70,x1:b.nodes[0].x-dir*64,y1:b.nodes[0].y};a.state="FLYING";b.state="INTERACTING";pair={a,b,since:0};orbs=[];
 if(isHost()&&a===hostWisp){orbs=["🤗","✋","🕯️","💫","💃"].map((icon,i)=>({i,icon,x:b.nodes[0].x-60+i*30,y:b.nodes[0].y-62}))}}
async function reactOrb(o){if(!pair)return;const visitor=pair.b.soul.visitor_id;await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json","X-Host-Secret":hostSecret()},body:JSON.stringify({action:"react",visitor_id:visitor,react:o.i+1})});pair.effect=o.i;pair.since=performance.now();orbs=[];toast("Reaction shared");await load()}
canvas.addEventListener("pointermove",e=>{const r=canvas.getBoundingClientRect();mouse={x:e.clientX-r.left,y:e.clientY-r.top};for(const w of allWisps())if(Math.hypot(mouse.x-w.nodes[0].x,mouse.y-w.nodes[0].y)<44)w.rip=1});
canvas.addEventListener("pointerdown",e=>{const r=canvas.getBoundingClientRect();mouse={x:e.clientX-r.left,y:e.clientY-r.top};
 for(const o of orbs)if(Math.hypot(mouse.x-o.x,mouse.y-o.y)<18){reactOrb(o);return}
 const hit=allWisps().find(w=>Math.hypot(mouse.x-w.nodes[0].x,mouse.y-w.nodes[0].y)<42);
 if(hit&&hit.soul.visitor_id===myVid()){dragWisp=hit;return}
 if(hit&&hostWisp){const me=wisps.get(myVid());const actor=isHost()?hostWisp:me;if(actor&&hit!==actor)flyTo(actor,hit)}});
addEventListener("pointerup",()=>{if(dragWisp&&mouse.y>canvas.clientHeight-52){openLimbo()}dragWisp=null});
$("#openBtn").onclick=createSanctuary;$("#limboBtn").onclick=openLimbo;$("#shareBtn").onclick=()=>{navigator.clipboard?.writeText(location.href);toast("Link copied")};
$("#closeLimbo").onclick=()=>$("#limbo").hidden=true;$("#releaseBtn").onclick=release;
["fTint","fEyes","fItem","fHat","fBeat0","fBeat1","fBeat2"].forEach(id=>$("#"+id).addEventListener("change",()=>{if(heroWisp&&id==="fHat")heroWisp.hatSpring.v-=6;if(heroWisp)heroWisp.soul=currentSoul()}));
$("#hero").addEventListener("pointermove",e=>{const r=e.target.getBoundingClientRect();mouse={x:(e.clientX-r.left)*360/r.width,y:(e.clientY-r.top)*360/r.height}});
addEventListener("hashchange",()=>{sid=location.hash.slice(1)||null;load()});
(async()=>{let man=null;try{man=await(await fetch("/assets/manifest.json")).json()}catch{}
 const eyePaths=man?.eyes?.map(e=>"/"+e.file)||[0,1,2,3,4].map(i=>`/assets/ghost/eyes/${i}.svg`);const itemPaths=man?.items?.map(e=>"/"+e.file)||[0,1,2,3,4].map(i=>`/assets/ghost/items/${i}.svg`);const hatPaths=man?.hats?.map(e=>"/"+e.file)||[0,1,2,3,4].map(i=>`/assets/ghost/hats/${i}.svg`);
 eyeImgs=loadImgs(eyePaths);itemImgs=loadImgs(itemPaths);hatImgs=loadImgs(hatPaths);window._manifest=man;
 const fill=(sel,arr)=>sel.replaceChildren(...arr.map((v,i)=>new Option(v,i)));fill($("#fTint"),TINTS.map((_,i)=>"Tint "+i));fill($("#fEyes"),EYE_NAMES);fill($("#fItem"),ITEMS.map(v=>v||"None"));fill($("#fHat"),HATS.map(v=>v||"None"));["#fBeat0","#fBeat1","#fBeat2"].forEach((s,i)=>{fill($(s),MIMES);$(s).value=i});
 if(sid&&localStorage.getItem("wispn_host_"+sid))toast("Welcome back, host");window._env=0;makeParticles();requestAnimationFrame(frame);await load()})();

