const MIMES=["Shy Peek","Happy Hop","Slow Sway","Curious Tilt","Offering Bow","Joyful Twirl","Cozy Huddle","Playful Orbit"];
const TINTS=["#f8fafc","#fda4af","#93c5fd","#86efac","#fde68a"],EYE_NAMES=["Soft Wonder","Happy Arc","Wide Curious","Peaceful Slumber","Cozy Starry"],ITEMS=["","🌸","⭐","🍄","🔮","🕯️"],HATS=["","🎩","🌿","👑","🧢","🌙"],HAIR_STYLES=["None","Tuft","Bob","Long flow","Spiky","Bun"],HAIR_COLORS=["#fef9c3","#fda4af","#93c5fd","#4ade80","#1f2937"];
const SEG=[14,15,16,16],RAD=[26,28,25,20,12],ENV_WIND=[.12,.05,.3,.8,.5,.35],ENV_DAMP=[.90,.94,.84,.92,.9,.88],PART_N=[45,50,60,70,80,55];
const $=s=>document.querySelector(s),stage=$("#stage"),canvas=$("#world");let ctx=canvas.getContext("2d");
let bgImgs=[],sid=location.hash.slice(1)||null,souls=[],wisps=new Map(),hostWisp=null,beat=0,beatT=0,mouse={x:-999,y:-999},particles=[],pair=null,orbs=[],dragWisp=null,eyeImgs=[],itemImgs=[],hatImgs=[],fx=[],kelp=[],gust=0;
function toast(m){$("#toast").textContent=m}
function visitorToken(){let t=localStorage.getItem("wispn_token");if(!t){t=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,"0")).join("");localStorage.setItem("wispn_token",t)}return t}
function myVid(){return +(localStorage.getItem("wispn_my_vid")||0)}
function hostSecret(){return sid?localStorage.getItem("wispn_host_"+sid):null}
function isHost(){return !!hostSecret()}
function decodePacket(buf){const b=new Uint8Array(buf);if(b.length<10)throw new Error("short packet");const out=[];for(let i=0;i<b[1];i++){const o=10+i*12,outv=new DataView(buf,o,12);out.push({visitor_id:outv.getUint32(0,true),appearance:b[o+4],item_and_hat:b[o+5],mime_seq:[b[o+6],b[o+7],b[o+8]],mime_tempo:b[o+9],host_react:b[o+10],hair:b[o+11]})}return{env:b[0],hostGhost:[...b.slice(2,9)],souls:out}}
function loadImgs(paths){return paths.map(p=>{const i=new Image();i.src=p;return i})}
function makeWisp(soul,x,y,scale=1){return{soul,x,y,scale,nodes:Array.from({length:5},(_,i)=>({x,y:y+i*15,px:x,py:y+i*15})),hairPts:null,gaze:{x:0,y:0,tx:0,ty:0},blink:2+Math.random()*3,blinkPh:0,hatSpring:{y:0,v:0},pend:0,pendV:0,phase:Math.random()*7,rip:0}}
function syncWisps(){const W=canvas.clientWidth,H=canvas.clientHeight;souls.forEach((s,i)=>{if(!wisps.has(s.visitor_id)){const x=60+(i%10)*(W-120)/9,y=90+Math.floor(i/10)*90;wisps.set(s.visitor_id,makeWisp(s,x,y))}else wisps.get(s.visitor_id).soul=s});for(const k of [...wisps.keys()])if(!souls.find(s=>s.visitor_id===k))wisps.delete(k);
 if(window._hostGhost){const hg={visitor_id:0,appearance:window._hostGhost[0],item_and_hat:window._hostGhost[1],mime_seq:window._hostGhost.slice(2,5),mime_tempo:window._hostGhost[5],host_react:0,hair:0};if(!hostWisp)hostWisp=makeWisp(hg,W/2,110,1.15);hostWisp.soul=hg}}
function ik(sx,sy,tx,ty,l1,l2,bend){const dx=tx-sx,dy=ty-sy;let d=Math.hypot(dx,dy);d=Math.min(d,l1+l2-.01);const a=Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d)))),base=Math.atan2(dy,dx),ea=base+bend*a;return{ex:sx+Math.cos(ea)*l1,ey:sy+Math.sin(ea)*l1,hx:sx+Math.cos(base)*d,hy:sy+Math.sin(base)*d}}
function poseForMime(w,t,m){const s=w.soul,ph=t*(0.9+s.mime_tempo*.45)+w.phase,sn=Math.sin(ph),cs=Math.cos(ph);const base={ox:0,oy:0,rot:0,sx:1,sy:1,seg:1,blush:.35,handL:[-24,18],handR:[24,18],headTilt:0};
 if(m===0)return{...base,oy:4-3*Math.max(0,sn),handL:[-7,-6],handR:[7,sn>0?-6:4],blush:sn>0?.75:.4,headTilt:-4*sn};
 if(m===1)return{...base,oy:-22*Math.abs(sn),handL:[-22,-34],handR:[22,-34],sy:1+.08*Math.abs(cs)};
 if(m===2)return{...base,ox:18*sn,rot:5*sn,handL:[0,8],handR:[0,8],headTilt:6*sn};
 if(m===3)return{...base,ox:8*sn,rot:16,headTilt:28,handL:[-8,4],handR:[26,22]};
 if(m===4)return{...base,oy:14*Math.max(0,sn),rot:12,handL:[-10,12],handR:[10,12],headTilt:8};
 if(m===5){return{...base,sx:Math.abs(cs)*.9+.25,flare:1.25,handL:[-28,0],handR:[28,0],rot:8*sn,twirl:cs,twirlSin:sn}}
 if(m===6)return{...base,seg:.72,ox:(Math.random()-.5)*3,handL:[14,-2],handR:[-14,-2],sy:.9};
 return{...base,ox:26*sn,oy:-10+14*cs,rot:18*cs,handL:[-28,-8],handR:[28,-8]}}
function pose(w,t){const s=w.soul;if(w.forceMime!=null)return poseForMime(w,t,w.forceMime);const cur=poseForMime(w,t,s.mime_seq[beat%3]);const frac=beatT/1.2;if(frac<0.75)return cur;const nxt=poseForMime(w,t,s.mime_seq[(beat+1)%3]);let u=(frac-0.75)/0.25;u=u*u*(3-2*u);const mix=(a,b)=>a+(b-a)*u,arr=(a,b)=>[mix(a[0],b[0]),mix(a[1],b[1])];return{...cur,ox:mix(cur.ox||0,nxt.ox||0),oy:mix(cur.oy||0,nxt.oy||0),rot:mix(cur.rot||0,nxt.rot||0),sx:mix(cur.sx||1,nxt.sx||1),sy:mix(cur.sy||1,nxt.sy||1),seg:mix(cur.seg||1,nxt.seg||1),headTilt:mix(cur.headTilt||0,nxt.headTilt||0),blush:mix(cur.blush||.35,nxt.blush||.35),handL:arr(cur.handL,nxt.handL),handR:arr(cur.handR,nxt.handR),flare:nxt.flare,twirl:nxt.twirl,twirlSin:nxt.twirlSin}}
function stepWisp(w,t,dt){const p=pose(w,t),home=w.fly?null:{x:w.homeX+((p.ox||0)+(w.pairOx||0))*w.scale,y:w.homeY+(p.oy||0)*w.scale};let tx,ty;
 if(w.fly){const f=w.fly,e=Math.min(1,(performance.now()-f.t0)/850),ee=e<.5?2*e*e:1-Math.pow(-2*e+2,2)/2;tx=f.x0+(f.cx-f.x0)*ee+(f.x1-f.cx)*ee*ee;ty=f.y0+(f.cy-f.y0)*ee+(f.y1-f.cy)*ee*ee - Math.sin(ee*Math.PI)*24;if(e>=1){w.state="INTERACTING";w.fly=null;if(pair)pair.since=performance.now()}}else if(dragWisp===w){tx=mouse.x;ty=mouse.y}else{tx=home.x;ty=home.y}
 const n=w.nodes,k=w.scale,damp=ENV_DAMP[window._env||0];
 const vx=(tx-n[0].x)*.08,vy=(ty-n[0].y)*.08;n[0].px=n[0].x;n[0].py=n[0].y;n[0].x+=vx;n[0].y+=vy;
 for(let i=1;i<5;i++){const nd=n[i],pvx=(nd.x-nd.px)*damp,pvy=(nd.y-nd.py)*damp;nd.px=nd.x;nd.py=nd.y;nd.x+=pvx+ENV_WIND[window._env||0]*.06*(1+gust*2.5)*Math.sin(t*1.3+i);nd.y+=pvy+.12}
 for(let it=0;it<3;it++)for(let i=1;i<5;i++){const a=n[i-1],b=n[i],want=SEG[i-1]*k*(p.seg||1);let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;const diff=(d-want)/d;b.x-=dx*diff*(i===1?.2:.5);b.y-=dy*diff*(i===1?.2:.5);
  if(i>1){const pa=Math.atan2(n[i-1].y-n[i-2].y,n[i-1].x-n[i-2].x);let ca=Math.atan2(b.y-a.y,b.x-a.x),dd=ca-pa;while(dd>Math.PI)dd-=2*Math.PI;while(dd<-Math.PI)dd+=2*Math.PI;const lim=32*Math.PI/180;if(Math.abs(dd)>lim){ca=pa+Math.sign(dd)*lim;b.x=a.x+Math.cos(ca)*want;b.y=a.y+Math.sin(ca)*want}}}
 w.pose=p;
 {const d={x:n[1].x-n[0].x,y:n[1].y-n[0].y},l=Math.hypot(d.x,d.y)||1,dx=d.x/l,dy=d.y/l;
  w.rig={dx,dy,px:-dy,py:dx,headAngle:Math.atan2(dy,dx)-Math.PI/2};
  const t4={x:n[4].x-n[3].x,y:n[4].y-n[3].y},tl=Math.hypot(t4.x,t4.y)||1,tx=t4.x/tl,ty=t4.y/tl,qx=-ty,qy=tx,R=RAD[4]*k;
  const anchors=[];for(let i=0;i<5;i++){const f=i/4,tip=[0,6,16,6,0][i]*k;anchors.push({x:n[4].x+qx*R*(f*2-1)+tx*tip,y:n[4].y+qy*R*(f*2-1)+ty*tip})}
  if(!w.tailPts)w.tailPts=anchors.map(a=>({x:a.x,y:a.y,px:a.x,py:a.y}));
  w.tailPts.forEach((pt,i)=>{const a=anchors[i],vx=(pt.x-pt.px)*.88,vy=(pt.y-pt.py)*.88;pt.px=pt.x;pt.py=pt.y;pt.x+=vx+(a.x-pt.x)*.34+ENV_WIND[window._env||0]*.08*(1+gust*2);pt.y+=vy+(a.y-pt.y)*.34+.1});
  for(let it=0;it<2;it++)for(let i=1;i<5;i++){const A=w.tailPts[i-1],B=w.tailPts[i],restA=Math.hypot(anchors[i].x-anchors[i-1].x,anchors[i].y-anchors[i-1].y);let ddx=B.x-A.x,ddy=B.y-A.y,dd=Math.hypot(ddx,ddy)||1,diff=(dd-restA)/dd*.5;A.x+=ddx*diff;A.y+=ddy*diff;B.x-=ddx*diff;B.y-=ddy*diff}
  w.tailAnchors=anchors}
 gust=(window._env===3)?Math.max(0,Math.sin(t*(2*Math.PI/4.5)))*( (t%4.5)<1.2?1:0.15):0;
 if(w.fly&&Math.random()<.6)fx.push({x:n[4].x,y:n[4].y,vx:(Math.random()-.5)*.6,vy:.4+Math.random()*.5,life:1,c:"#fef9c3",r:2});
 if(pair&&pair.effect!=null){const el=performance.now()-pair.since,o=pair.a===w?pair.b:pair.a;
  if(el<2600){const midx=(n[0].x+o.nodes[0].x)/2,midy=(n[0].y+o.nodes[0].y)/2,dirx=Math.sign(o.nodes[0].x-n[0].x)||1;
   if(pair.effect===0){w.pairOx=dirx*18+Math.sin(el*.004)*4;w.pairHands={L:{x:o.nodes[1].x-14,y:o.nodes[1].y},R:{x:o.nodes[1].x+14,y:o.nodes[1].y}};if(Math.random()<.08)fx.push({x:midx,y:midy-20,vx:(Math.random()-.5)*.8,vy:-.7,life:1,c:"#fda4af",r:3,heart:true})}
   if(pair.effect===1){w.pairOx=el<400?-dirx*8:0;w.pairHands={L:{x:midx,y:midy-18},R:{x:midx,y:midy-18}};if(el>=400&&!pair.burstDone){pair.burstDone=true;for(let i=0;i<22;i++)fx.push({x:midx,y:midy-18,vx:Math.cos(i/22*6.28)*2.4,vy:Math.sin(i/22*6.28)*2.4,life:1,c:"#fef08a",r:2.4})}if(el>=400)w.pose.oy=-20*Math.abs(Math.sin(el*.006))}
   if(pair.effect===2){w.pairHands={L:{x:midx,y:midy},R:{x:midx+6,y:midy+4}};o.goldRim=true;if(Math.random()<.25)fx.push({x:midx,y:midy,vx:(Math.random()-.5)*.5,vy:-.5,life:1,c:"#fbbf24",r:2.2})}
   if(pair.effect===3){w.pairOx=dirx*8;w.forceEye=3;if(el%500<18)fx.push({x:midx,y:midy,life:1,c:"#bae6fd",r:6,ring:true,vx:0,vy:0})}
   if(pair.effect===4){w.forceMime=[5,2,4][Math.floor(el/800)%3]}
  }else{pair.effect=null;w.pairHands=null;w.forceMime=null;w.forceEye=null;w.pairOx=0}}
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
 const hem=(w.tailPts&&w.tailPts.length===5)?w.tailPts.map(pt=>({x:pt.x,y:pt.y})):pts[4]?[{x:pts[4].lx,y:pts[4].ly},{x:pts[4].rx,y:pts[4].ry}]:[];return{pts,hem}}
function smoothPath(points){let d=`M ${points[0].x} ${points[0].y}`;for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];d+=` C ${p1.x+(p2.x-p0.x)/6} ${p1.y+(p2.y-p0.y)/6}, ${p2.x-(p3.x-p1.x)/6} ${p2.y-(p3.y-p1.y)/6}, ${p2.x} ${p2.y}`}return d}

function drawHair(w,t,behind){const s=w.soul,style=(s.hair||0)&15;if(!style)return;const color=HAIR_COLORS[((s.hair||0)>>4)%5],n=w.nodes,k=w.scale;
 const strands=style===1?3:style===2?5:style===3?7:style===4?6:4,len=[0,16,30,52,20,12][style],rig=w.rig||{px:1,py:0,dx:0,dy:1};
 if(!w.hairPts||w.hairPts.length!==strands)w.hairPts=Array.from({length:strands},()=>({x:n[0].x,y:n[0].y,px:n[0].x,py:n[0].y}));
 ctx.strokeStyle=color;ctx.lineCap="round";
 w.hairPts.forEach((pt,i)=>{const off=(i/(Math.max(1,strands-1))-.5)*34*k,ax=n[0].x+rig.px*off+rig.dx*-18*k,ay=n[0].y+rig.py*off+rig.dy*-18*k;
  if(!behind&&style!==3)return; if(behind&&style===3&&i>1&&i<strands-2)return;
  const vx=(pt.x-pt.px)*.88,vy=(pt.y-pt.py)*.88;pt.px=pt.x;pt.py=pt.y;pt.x+=vx+(ax-pt.x)*.18+ENV_WIND[window._env||0]*.12*Math.sin(t*3+i)+gust*.35;pt.y+=vy+(ay+len*k-pt.y)*.14+.22;
  ctx.lineWidth=(style===2?7:5)*k;ctx.beginPath();ctx.moveTo(ax,ay-4*k);ctx.quadraticCurveTo((ax+pt.x)/2,(ay+pt.y)/2-4,pt.x,pt.y);ctx.stroke()});
 if(!behind){ctx.fillStyle=color;ctx.beginPath();ctx.arc(n[0].x+rig.dx*-20*k,n[0].y+rig.dy*-20*k,(style===5?9:13)*k,Math.PI,0);ctx.fill();if(style===5){ctx.beginPath();ctx.arc(n[0].x+rig.dx*-30*k,n[0].y+rig.dy*-30*k,7*k,0,7);ctx.fill()}}}
function drawWisp(w,t){const s=w.soul,k=w.scale,n=w.nodes,p=w.pose||pose(w,t),{pts,hem}=contour(w);
 const headTan={x:n[1].x-n[0].x,y:n[1].y-n[0].y},htl=Math.hypot(headTan.x,headTan.y)||1,hx=headTan.x/htl,hy=headTan.y/htl,px=-hy,py=hx;
 const headArc=[0,.25,.5,.75,1].map(f=>{const a=f*Math.PI;return{x:n[0].x+(px*Math.cos(a)-hx*Math.sin(a))*RAD[0]*k,y:n[0].y+(py*Math.cos(a)-hy*Math.sin(a))*RAD[0]*k}});
 const hull=[...headArc.reverse(),...pts.slice(1).map(q=>({x:q.lx,y:q.ly})),...hem,...pts.slice(0,4).reverse().map(q=>({x:q.rx,y:q.ry}))];
 const path=new Path2D(smoothPath(hull));
 const tint=TINTS[(s.appearance>>4)%5];
 ctx.save();ctx.globalCompositeOperation="screen";const au=ctx.createRadialGradient(n[0].x,n[0].y,4,n[0].x,n[0].y,65*k);au.addColorStop(0,tint);au.addColorStop(1,"transparent");ctx.globalAlpha=.15+.15*Math.sin(t*2*Math.PI*.8+w.phase);ctx.fillStyle=au;ctx.beginPath();ctx.arc(n[0].x,n[0].y,65*k,0,7);ctx.fill();ctx.restore();
 const shoulder=(side)=>{const d={x:n[2].x-n[1].x,y:n[2].y-n[1].y},l=Math.hypot(d.x,d.y)||1,dx=d.x/l,dy=d.y/l;return{x:n[1].x+(-dy)*side*20*k+dx*-2*k,y:n[1].y+(dx)*side*20*k+dy*-2*k}};
 const handWorld=(h,side)=>{if(w.pairHands)return side<0?w.pairHands.L:w.pairHands.R;return{x:n[0].x+h[0]*k,y:n[0].y+h[1]*k}};
 const drawArm=(side,target,onTop)=>{const sh=shoulder(side),sol=ik(sh.x,sh.y,target.x,target.y,17*k,15*k,side);const ag=ctx.createLinearGradient(sh.x,sh.y,sol.hx,sol.hy);ag.addColorStop(0,tint);ag.addColorStop(1,tint+"aa");ctx.strokeStyle=ag;ctx.lineCap="round";ctx.lineWidth=11*k;ctx.beginPath();ctx.moveTo(sh.x,sh.y);ctx.lineTo(sol.ex,sol.ey);ctx.stroke();ctx.lineWidth=8.5*k;ctx.beginPath();ctx.moveTo(sol.ex,sol.ey);ctx.lineTo(sol.hx,sol.hy);ctx.stroke();ctx.fillStyle=tint;ctx.beginPath();ctx.arc(sol.hx,sol.hy,5.5*k,0,7);ctx.fill();ctx.fillStyle="rgba(255,255,255,.55)";ctx.beginPath();ctx.arc(sol.hx-1.5*k,sol.hy-1.5*k,1.8*k,0,7);ctx.fill();return sol};
 drawHair(w,t,true);const backSide=w.gaze.x>=0?1:-1;drawArm(backSide,handWorld(backSide>0?p.handR:p.handL,backSide),false);
 const grad=ctx.createLinearGradient(n[0].x,n[0].y-26*k,n[4].x,n[4].y);grad.addColorStop(0,tint);grad.addColorStop(1,tint+"66");ctx.globalAlpha=.95;ctx.fillStyle=grad;ctx.fill(path);ctx.globalAlpha=1;
 const blinkAge=(performance.now()-w.blinkPh)/140,blinkScale=blinkAge<1?Math.abs(Math.cos(blinkAge*Math.PI))*.95+.05:1;
 ctx.save();ctx.translate(n[0].x,n[0].y);ctx.rotate((w.rig?w.rig.headAngle:0)+(p.headTilt||0)*Math.PI/180*.5);ctx.translate(w.gaze.x*k,-4*k+w.gaze.y*k);ctx.fillStyle="rgba(244,114,182,.35)";ctx.beginPath();ctx.ellipse(-14*k,7*k,10*k,6*k,0,0,7);ctx.ellipse(14*k,7*k,10*k,6*k,0,0,7);ctx.fill();
 const twirlOff=(p.twirlSin||0)*16*k,backFace=(p.twirl!=null&&p.twirl<0);ctx.save();if(backFace)ctx.globalAlpha=.32;ctx.translate(twirlOff,0);const eyeImg=eyeImgs[w.forceEye!=null?w.forceEye:(s.appearance&15)%5];ctx.save();ctx.scale(w.gaze.x>5?.82:1,blinkScale);if(eyeImg&&eyeImg.complete)ctx.drawImage(eyeImg,-20*k,-9*k,40*k,18*k);else{ctx.fillStyle="#1f2937";ctx.font=`${12*k}px system-ui`;ctx.textAlign="center";ctx.fillText("• ‿ •",0,4*k)}ctx.restore();ctx.restore();
 const hatIdx=(s.item_and_hat&15)%6;if(hatIdx){ctx.save();ctx.translate(n[0].x,n[0].y);ctx.rotate((w.rig?w.rig.headAngle:0)+(p.headTilt||0)*Math.PI/180*.5);ctx.translate(-w.gaze.x*.2*k,-24*k+Math.max(-2,Math.min(4,w.hatSpring.y)));const hi=hatImgs[hatIdx-1];ctx.font=`${22*k}px system-ui`;ctx.textAlign="center";if(hi&&hi.complete)ctx.drawImage(hi,-13*k,-22*k,26*k,26*k);else ctx.fillText(HATS[hatIdx],0,0);ctx.restore()}ctx.restore();
 drawHair(w,t,false);const frontSol=drawArm(-backSide,handWorld(backSide>0?p.handL:p.handR,-backSide),true);
 const itemIdx=(s.item_and_hat>>4)%6;if(itemIdx){const dangles=itemIdx>=4;ctx.save();ctx.translate(frontSol.hx,frontSol.hy);ctx.rotate(dangles?w.pend:(Math.atan2(frontSol.hy-frontSol.ey,frontSol.hx-frontSol.ex)+.78));const ii=itemImgs[itemIdx-1];if(ii&&ii.complete)ctx.drawImage(ii,-11*k,0,22*k,22*k);else{ctx.font=`${16*k}px system-ui`;ctx.textAlign="center";ctx.fillText(ITEMS[itemIdx],0,14*k)}ctx.restore();
  if(itemIdx>=3&&Math.random()<.35){const gc=window._manifest?.items?.[itemIdx-1]?.glowColor||"#fbbf24";fx.push({x:frontSol.hx,y:frontSol.hy+8*k,vx:(Math.random()-.5)*.7,vy:-.4-Math.random()*.6,life:1,c:gc,r:1.6+Math.random()*1.6})}
  if(itemIdx>=4){ctx.save();ctx.globalCompositeOperation="screen";ctx.fillStyle="rgba(251,191,36,.25)";ctx.beginPath();ctx.arc(frontSol.hx,frontSol.hy+10*k,16*k,0,7);ctx.fill();ctx.restore()}}
 ctx.strokeStyle=(w.goldRim||s.host_react===3)?"rgba(251,191,36,.85)":"rgba(255,255,255,.6)";ctx.lineWidth=2.5*k;ctx.beginPath();ctx.arc(n[0].x,n[0].y,24*k,Math.PI*1.05,Math.PI*1.55);ctx.stroke();
 if(s.host_react){const a=t*1.2+s.visitor_id;ctx.fillStyle="#fde68a";ctx.font="13px system-ui";ctx.textAlign="center";ctx.fillText("✦",n[0].x+Math.cos(a)*30*k,n[0].y-18*k+Math.sin(a)*8*k)}
 if(w.rip>0){ctx.strokeStyle=`rgba(255,255,255,${w.rip})`;ctx.beginPath();ctx.arc(n[0].x,n[0].y,(1-w.rip)*44+12,0,7);ctx.stroke()}}
function makeParticles(){const n=PART_N[window._env||0];particles=Array.from({length:n},()=>({x:Math.random()*canvas.clientWidth,y:Math.random()*canvas.clientHeight,s:.5+Math.random()*2,v:.2+Math.random()*.8,ph:Math.random()*7}));
 kelp=Array.from({length:9},(_,ki)=>({x:40+ki*(canvas.clientWidth-80)/8,pts:Array.from({length:5},(_,i)=>({x:40+ki*(canvas.clientWidth-80)/8,y:canvas.clientHeight-i*16,px:40+ki*(canvas.clientWidth-80)/8,py:canvas.clientHeight-i*16}))}))}
function drawProps(t){const W=canvas.clientWidth,H=canvas.clientHeight,e=window._env||0;
 if(e===2){ctx.strokeStyle="#22c55e";ctx.lineWidth=5;ctx.lineCap="round";for(const k of kelp){for(let i=1;i<k.pts.length;i++){const pt=k.pts[i];let bend=0;for(const w of allWisps()){const d=Math.hypot(w.nodes[0].x-pt.x,w.nodes[0].y-pt.y);if(d<60)bend+=(pt.x<w.nodes[0].x?-1:1)*(60-d)*.02}const vx=(pt.x-pt.px)*.9+Math.sin(t*1.4+i*.7+pt.x*.05)*.35+bend;pt.px=pt.x;pt.py=pt.y;pt.x+=vx;pt.y=H-i*16+Math.sin(t+i)*1.5}ctx.beginPath();ctx.moveTo(k.pts[0].x,H);for(const pt of k.pts)ctx.lineTo(pt.x,pt.y);ctx.stroke()}}
 if(e===0){for(let i=0;i<8;i++){const x=50+i*(W-100)/7,y=H-30;let glow=.25;for(const w of allWisps()){const d=Math.hypot(w.nodes[0].x-x,w.nodes[0].y-y);if(d<110)glow=Math.max(glow,1-d/140)}ctx.fillStyle=`rgba(94,242,214,${glow})`;ctx.beginPath();ctx.arc(x,y,7+glow*7+Math.sin(t*2+i)*1.5,0,7);ctx.fill();ctx.fillStyle="#a7f3d0";ctx.fillRect(x-1.5,y,3,10)}}
 if(e===5){ctx.fillStyle="rgba(125,211,252,.5)";for(let i=0;i<26;i++){const x=(i*67+t*18)%W,y=H-36+Math.sin(i*2.1+t*1.26)*5;ctx.fillRect(x,y,2.4,2.4)}}}
function drawFx(dt){for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt*.7;if(f.life<=0){fx.splice(i,1);continue}f.x+=f.vx;f.y+=f.vy;if(f.ring){f.r+=dt*46;ctx.strokeStyle=`rgba(186,230,253,${f.life*.7})`;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.stroke()}else{ctx.globalAlpha=Math.max(0,f.life);ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill();ctx.globalAlpha=1;if(f.heart){ctx.fillStyle=f.c;ctx.font="10px system-ui";ctx.fillText("♥",f.x-4,f.y-4)}}}}
function drawEnv(t){const W=canvas.clientWidth,H=canvas.clientHeight,e=window._env||0;const bg=bgImgs[e];if(bg&&bg.complete&&bg.naturalWidth){const sc=Math.max(W/bg.naturalWidth,H/bg.naturalHeight),dw=bg.naturalWidth*sc,dh=bg.naturalHeight*sc;ctx.drawImage(bg,(W-dw)/2+Math.sin(t*.05)*4,(H-dh)/2,dw,dh);ctx.fillStyle="rgba(10,8,24,.12)";ctx.fillRect(0,0,W,H)}else{const skies=[["#071714","#13382e","#0a2019"],["#fdf6f0","#f7d6e0","#c8d9f8"],["#16697a","#0b3a54","#061a2e"],["#140d26","#8c3b2b","#d97f38"],["#0f203c","#4b3d60","#e8f1fc"],["#ff6b6b","#feca57","#2e1f47"]][e];const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,skies[0]);g.addColorStop(.55,skies[1]);g.addColorStop(1,skies[2]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
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
 drawProps(t);const list=allWisps().sort((a,b)=>a.nodes[0].y-b.nodes[0].y);for(const w of list){if(!w.homeX){w.homeX=w.nodes[0].x;w.homeY=w.nodes[0].y}stepWisp(w,t,dt);if(w.rip>0)w.rip-=.02;drawWisp(w,t)}drawFx(dt);
 if(pair&&orbs.length){for(const o of orbs){o.y+=Math.sin(t*2+o.i)*.3;ctx.fillStyle="rgba(253,224,171,.92)";ctx.beginPath();ctx.arc(o.x,o.y,15,0,7);ctx.fill();ctx.fillStyle="#7c2d12";ctx.font="13px system-ui";ctx.textAlign="center";ctx.fillText(o.icon,o.x,o.y+5)}}
 requestAnimationFrame(frame)}
async function load(){if(!sid){$("#empty").hidden=false;return}$("#empty").hidden=true;const h={};const sec=hostSecret();if(sec)h["X-Host-Secret"]=sec;const r=await fetch(`/api/s/${sid}`,{headers:h});if(!r.ok){toast("Sanctuary not found");return}const p=decodePacket(await r.arrayBuffer());window._env=p.env;window._hostGhost=p.hostGhost;souls=p.souls;syncWisps();makeParticles();$("#roleBadge").textContent=isHost()?"host":"visitor";$("#roleBadge").classList.toggle("host",isHost());$("#envWrap").hidden=!isHost();$("#envSel").value=p.env}
async function createSanctuary(){const secret=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,"0")).join("");const r=await fetch("/api/sanctuaries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({host_secret:secret,env_id:0,host_ghost:[0x01,0,0,1,2,1,0]})});const j=await r.json();if(!r.ok){toast(j.error||"create failed");return}localStorage.setItem("wispn_host_"+j.id,secret);sid=j.id;location.hash=sid;await load();openLimbo()}
function currentSoul(){return{visitor_id:myVid()||999999,appearance:((+$("#fTint").value)<<4)|(+$("#fEyes").value),item_and_hat:((+$("#fItem").value)<<4)|(+$("#fHat").value),mime_seq:[+$("#fBeat0").value,+$("#fBeat1").value,+$("#fBeat2").value],mime_tempo:+$("#fTempo").value,host_react:0,hair:((+$("#fHairColor").value)<<4)|(+$("#fHair").value)}}
let heroWisp=null;
function openLimbo(){$("#limbo").hidden=false;$("#envWrap").hidden=!isHost();heroWisp=makeWisp(currentSoul(),180,180,2);heroWisp.homeX=180;heroWisp.homeY=180;drawHero()}
function drawHero(){if($("#limbo").hidden||!heroWisp)return;const hctx=$("#hero").getContext("2d");heroWisp.soul=currentSoul();heroWisp.gaze.tx=Math.max(-8,Math.min(8,(mouse.x-180)*.04));heroWisp.gaze.ty=Math.max(-5,Math.min(5,(mouse.y-180)*.04));stepWisp(heroWisp,performance.now()/1000,.016);hctx.clearRect(0,0,360,360);const g=hctx.createRadialGradient(180,150,20,180,180,220);g.addColorStop(0,"#2e2450");g.addColorStop(1,"#0d0a1a");hctx.fillStyle=g;hctx.fillRect(0,0,360,360);const worldCtx=ctx;ctx=hctx;drawWisp(heroWisp,performance.now()/1000);ctx=worldCtx;requestAnimationFrame(drawHero)}
async function release(){if(!sid){toast("Open a sanctuary first");return}const limbo=$("#limbo");limbo.classList.add("crossing");const body={action:"summon",visitor_token:visitorToken(),appearance:currentSoul().appearance,item_and_hat:currentSoul().item_and_hat,mime_seq:currentSoul().mime_seq,mime_tempo:currentSoul().mime_tempo,hair:currentSoul().hair};const r=await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(r.ok)localStorage.setItem("wispn_my_vid",j.visitor_id);if(isHost())await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json","X-Host-Secret":hostSecret()},body:JSON.stringify({action:"host_update",env_id:+$("#envSel").value})});setTimeout(async()=>{limbo.hidden=true;limbo.classList.remove("crossing");toast(r.ok?"Released into sanctuary":"Summon failed");await load()},1100)}
function flyTo(a,b){const dir=b.nodes[0].x>=a.nodes[0].x?1:-1;a.fly={t0:performance.now()+120,x0:a.nodes[0].x,y0:a.nodes[0].y,cx:(a.nodes[0].x+b.nodes[0].x)/2,cy:Math.min(a.nodes[0].y,b.nodes[0].y)-70,x1:b.nodes[0].x-dir*64,y1:b.nodes[0].y};a.state="FLYING";b.state="INTERACTING";pair={a,b,since:0};orbs=[];
 if(isHost()&&a===hostWisp){orbs=["🤗","✋","🕯️","💫","💃"].map((icon,i)=>({i,icon,x:b.nodes[0].x-60+i*30,y:b.nodes[0].y-62}))}}
async function reactOrb(o){if(!pair)return;const visitor=pair.b.soul.visitor_id;await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json","X-Host-Secret":hostSecret()},body:JSON.stringify({action:"react",visitor_id:visitor,react:o.i+1})});pair.effect=o.i;pair.since=performance.now();pair.burstDone=false;orbs=[];toast("Reaction shared");await load()}
let dragMoved=false,dragOff={x:0,y:0};
function evtPos(e){const r=canvas.getBoundingClientRect();const src=e.touches?e.touches[0]:e;return{x:src.clientX-r.left,y:src.clientY-r.top}}
function onDown(e){mouse=evtPos(e);dragMoved=false;
 for(const o of orbs)if(Math.hypot(mouse.x-o.x,mouse.y-o.y)<18){reactOrb(o);return}
 const hit=allWisps().find(w=>Math.hypot(mouse.x-w.nodes[0].x,mouse.y-w.nodes[0].y)<46);
 if(hit){dragWisp=hit;dragOff={x:mouse.x-hit.nodes[0].x,y:mouse.y-hit.nodes[0].y};canvas.style.cursor="grabbing";try{canvas.setPointerCapture&&e.pointerId!=null&&canvas.setPointerCapture(e.pointerId)}catch(_){} }}
function onMove(e){mouse=evtPos(e);if(dragWisp){dragMoved=true;mouse.x-=dragOff.x;mouse.y-=dragOff.y}for(const w of allWisps())if(Math.hypot(mouse.x-w.nodes[0].x,mouse.y-w.nodes[0].y)<44)w.rip=1}
function onUp(e){if(dragWisp){const wasDrag=dragMoved,w=dragWisp;canvas.style.cursor="grab";
 if(wasDrag&&mouse.y>canvas.clientHeight-60&&w.soul.visitor_id===myVid())openLimbo();
 else if(wasDrag){w.homeX=w.nodes[0].x;w.homeY=w.nodes[0].y}
 else if(!wasDrag&&hostWisp){const actor=isHost()?hostWisp:wisps.get(myVid());if(actor&&w!==actor)flyTo(actor,w)}}
 dragWisp=null}
canvas.addEventListener("pointerdown",onDown);canvas.addEventListener("mousedown",e=>{if(!window.PointerEvent)onDown(e)});
canvas.addEventListener("pointermove",onMove);canvas.addEventListener("mousemove",e=>{if(!window.PointerEvent)onMove(e)});
canvas.addEventListener("touchstart",onDown,{passive:true});canvas.addEventListener("touchmove",onMove,{passive:true});
addEventListener("pointerup",onUp);addEventListener("mouseup",e=>{if(!window.PointerEvent)onUp(e)});addEventListener("touchend",onUp);
$("#openBtn").onclick=createSanctuary;$("#limboBtn").onclick=openLimbo;$("#shareBtn").onclick=()=>{navigator.clipboard?.writeText(location.href);toast("Link copied")};
$("#closeLimbo").onclick=()=>$("#limbo").hidden=true;$("#releaseBtn").onclick=release;
["fTint","fEyes","fHair","fHairColor","fItem","fHat","fBeat0","fBeat1","fBeat2"].forEach(id=>$("#"+id).addEventListener("change",()=>{if(heroWisp&&id==="fHat")heroWisp.hatSpring.v-=6;if(heroWisp)heroWisp.soul=currentSoul()}));
$("#hero").addEventListener("pointermove",e=>{const r=e.target.getBoundingClientRect();mouse={x:(e.clientX-r.left)*360/r.width,y:(e.clientY-r.top)*360/r.height}});
addEventListener("hashchange",()=>{sid=location.hash.slice(1)||null;load()});
(async()=>{let man=null;try{man=await(await fetch("/assets/manifest.json")).json()}catch{}
 const eyePaths=man?.eyes?.map(e=>"/"+e.file)||[0,1,2,3,4].map(i=>`/assets/ghost/eyes/${i}.svg`);const itemPaths=man?.items?.map(e=>"/"+e.file)||[0,1,2,3,4].map(i=>`/assets/ghost/items/${i}.svg`);const hatPaths=man?.hats?.map(e=>"/"+e.file)||[0,1,2,3,4].map(i=>`/assets/ghost/hats/${i}.svg`);
 bgImgs=loadImgs(["forest","heaven","sea","dunes","mountain","beach"].map(n=>`/assets/environments/${n}_bg.jpg`));eyeImgs=loadImgs(eyePaths);itemImgs=loadImgs(itemPaths);hatImgs=loadImgs(hatPaths);window._manifest=man;
 const fill=(sel,arr)=>sel.replaceChildren(...arr.map((v,i)=>new Option(v,i)));fill($("#fTint"),TINTS.map((_,i)=>"Tint "+i));fill($("#fEyes"),EYE_NAMES);fill($("#fItem"),ITEMS.map(v=>v||"None"));fill($("#fHat"),HATS.map(v=>v||"None"));fill($("#fHair"),HAIR_STYLES);fill($("#fHairColor"),HAIR_COLORS.map((_,i)=>"Colour "+i));["#fBeat0","#fBeat1","#fBeat2"].forEach((s,i)=>{fill($(s),MIMES);$(s).value=i});
 if(sid&&localStorage.getItem("wispn_host_"+sid))toast("Welcome back, host");window._env=0;makeParticles();requestAnimationFrame(frame);await load()})();

