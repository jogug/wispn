const MIMES=["Shy Peek","Happy Hop","Slow Sway","Curious Tilt","Offering Bow","Joyful Twirl","Cozy Huddle","Playful Orbit"];
const TINTS=["#f8fafc","#fda4af","#93c5fd","#86efac","#fde68a"],EYE_NAMES=["Soft Wonder","Happy Arc","Wide Curious","Peaceful Slumber","Cozy Starry","Wink","Hearts","Dizzy Spiral","Sleepy","Big Sparkle"],ITEMS=["","🌸","⭐","🍄","🔮","🕯️"],HATS=["","🎩","🌿","👑","🧢","🌙","🧙","🍄","😇","🏴\u200d☠️","🌻"],HAIR_STYLES=["None","Tuft","Bob","Long flow","Spiky","Bun"],ARM_GESTURES=["Auto (mime)","Spooky wave","Hug","Chuckle","Offering","Droop"],HAIR_COLORS=["#fef9c3","#fda4af","#93c5fd","#4ade80","#1f2937"];
const SEG=[9,10,11,11],RAD=[28,31,28,23,14],ENV_WIND=[.12,.05,.3,.8,.5,.35],ENV_DAMP=[.90,.94,.84,.92,.9,.88],PART_N=[45,50,60,70,80,55];
const $=s=>document.querySelector(s),stage=$("#stage"),canvas=$("#world");let ctx=canvas.getContext("2d");
const CUST={bodyColor:"#f8fafc",hairColor:"#fef9c3",hair:1,eyes:0,item:0,hat:0,gesture:0};
const HAIR_FILES=["tuft","bob","long","spiky","bun"];
let orbImgs=[],bgImgs=[],bgFar=[],bgFg=[],bgNear=[],parX=0,parY=0,sid=location.hash.slice(1)||null,souls=[],wisps=new Map(),hostWisp=null,beat=0,beatT=0,mouse={x:-999,y:-999},particles=[],pair=null,orbs=[],dragWisp=null,eyeImgs=[],itemImgs=[],hatImgs=[],fx=[],gust=0;
function toast(m){$("#toast").textContent=m}
function visitorToken(){let t=localStorage.getItem("wispn_token");if(!t){t=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,"0")).join("");localStorage.setItem("wispn_token",t)}return t}
function myVid(){return +(localStorage.getItem("wispn_my_vid")||0)}
function hostSecret(){return sid?localStorage.getItem("wispn_host_"+sid):null}
function isHost(){return !!hostSecret()}
function isGuest(){return !!sid&&!isHost()&&souls.some(s=>s.visitor_id===myVid())}
function decodePacket(buf){const b=new Uint8Array(buf);if(b.length<10)throw new Error("short packet");const out=[];for(let i=0;i<b[1];i++){const o=10+i*12,outv=new DataView(buf,o,12);out.push({visitor_id:outv.getUint32(0,true),appearance:b[o+4],item_and_hat:b[o+5],mime_seq:[b[o+6],b[o+7],b[o+8]],mime_tempo:b[o+9]&3,arm_gesture:(b[o+9]>>2)&7,facial:(b[o+9]>>5)&3,host_react:b[o+10],hair:b[o+11]})}return{env:b[0],hostGhost:[...b.slice(2,9)],souls:out}}
function loadImgs(paths){return paths.map(p=>{const i=new Image();i.src=p;return i})}
function makeWisp(soul,x,y,scale=1){return{soul,x,y,scale,nodes:Array.from({length:5},(_,i)=>({x,y:y+i*15,px:x,py:y+i*15})),hairPts:null,gaze:{x:0,y:0,tx:0,ty:0},blink:2+Math.random()*3,blinkPh:0,hatSpring:{y:0,v:0},pend:0,pendV:0,phase:Math.random()*7,rip:0,idle:5+Math.random()*11,wander:null}}
function syncWisps(){const W=canvas.clientWidth,H=canvas.clientHeight;souls.forEach((s,i)=>{if(!wisps.has(s.visitor_id)){const jx=((i*47)%29)-14,jy=((i*31)%23)-11,x=W*(0.1+(i%5)*0.19)+jx,y=H*(0.22+Math.floor(i/5)%4*0.19)+jy;wisps.set(s.visitor_id,makeWisp(s,x,y,1.32))}else wisps.get(s.visitor_id).soul=s});for(const k of [...wisps.keys()])if(!souls.find(s=>s.visitor_id===k))wisps.delete(k);
 if(window._hostGhost){const hg={visitor_id:0,appearance:window._hostGhost[0],item_and_hat:window._hostGhost[1],mime_seq:window._hostGhost.slice(2,5),mime_tempo:window._hostGhost[5]&3,arm_gesture:0,facial:0,host_react:0,hair:0};if(!hostWisp)hostWisp=makeWisp(hg,W/2,130,1.5);hostWisp.soul=hg}}
function ik(sx,sy,tx,ty,l1,l2,bend){const dx=tx-sx,dy=ty-sy;let d=Math.hypot(dx,dy);d=Math.min(d,l1+l2-.01);const a=Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d)))),base=Math.atan2(dy,dx),ea=base+bend*a;return{ex:sx+Math.cos(ea)*l1,ey:sy+Math.sin(ea)*l1,hx:sx+Math.cos(base)*d,hy:sy+Math.sin(base)*d}}
function poseForMime(w,t,m){const s=w.soul,ph=t*(0.9+s.mime_tempo*.45)+w.phase,sn=Math.sin(ph),cs=Math.cos(ph);const base={ox:0,oy:0,rot:0,sx:1,sy:1,seg:1,blush:.35,handL:[-24,18],handR:[24,18],headTilt:0};
 if(m===0)return{...base,oy:4-3*Math.max(0,sn),handL:[-7,-6],handR:[7,sn>0?-6:4],blush:sn>0?.75:.4,headTilt:-4*sn};
 if(m===1)return{...base,oy:-22*Math.abs(sn),handL:[-22,-34],handR:[22,-34],sy:1+.08*Math.abs(cs)};
 if(m===2)return{...base,ox:18*sn,rot:5*sn,handL:[-5,8],handR:[5,8],headTilt:6*sn};
 if(m===3)return{...base,ox:8*sn,rot:16,headTilt:28,handL:[-8,4],handR:[26,22]};
 if(m===4)return{...base,oy:14*Math.max(0,sn),rot:12,handL:[-10,12],handR:[10,12],headTilt:8};
 if(m===5){return{...base,sx:Math.abs(cs)*.9+.25,flare:1.25,handL:[-28,0],handR:[28,0],rot:8*sn,twirl:cs,twirlSin:sn}}
 if(m===6)return{...base,seg:.72,ox:(Math.random()-.5)*3,handL:[14,-2],handR:[-14,-2],sy:.9};
 return{...base,ox:26*sn,oy:-10+14*cs,rot:18*cs,handL:[-28,-8],handR:[28,-8]}}
function applyGesture(pp,w,t){const g=w.soul.arm_gesture||0;if(!g)return pp;const ph=t*2.4+w.phase,sn=Math.sin(ph);
 if(g===1)return{...pp,handL:[-24,-38+6*sn],handR:[24,-38-6*sn]};
 if(g===2)return{...pp,handL:[16,-2],handR:[-16,-2]};
 if(g===3)return{...pp,handL:[-7,3+2*sn],handR:[8,2-2*sn]};
 if(g===4)return{...pp,handL:[-12,16],handR:[12,16]};
 return{...pp,handL:[-20,48+3*sn],handR:[20,48-3*sn]}}
function pose(w,t){const s=w.soul;if(w.forceMime!=null)return applyGesture(poseForMime(w,t,w.forceMime),w,t);const cur=applyGesture(poseForMime(w,t,s.mime_seq[beat%3]),w,t);const frac=beatT/1.2;if(frac<0.75)return cur;const nxt=applyGesture(poseForMime(w,t,s.mime_seq[(beat+1)%3]),w,t);let u=(frac-0.75)/0.25;u=u*u*(3-2*u);const mix=(a,b)=>a+(b-a)*u,arr=(a,b)=>[mix(a[0],b[0]),mix(a[1],b[1])];return{...cur,ox:mix(cur.ox||0,nxt.ox||0),oy:mix(cur.oy||0,nxt.oy||0),rot:mix(cur.rot||0,nxt.rot||0),sx:mix(cur.sx||1,nxt.sx||1),sy:mix(cur.sy||1,nxt.sy||1),seg:mix(cur.seg||1,nxt.seg||1),headTilt:mix(cur.headTilt||0,nxt.headTilt||0),blush:mix(cur.blush||.35,nxt.blush||.35),handL:arr(cur.handL,nxt.handL),handR:arr(cur.handR,nxt.handR),flare:nxt.flare,twirl:nxt.twirl,twirlSin:nxt.twirlSin}}
function stepWisp(w,t,dt){const p=pose(w,t),home=w.fly?null:{x:w.homeX+((p.ox||0)+(w.pairOx||0))*w.scale,y:w.homeY+(p.oy||0)*w.scale};let tx,ty;
 {const inPair=pair&&(pair.a===w||pair.b===w);
  if(w!==heroWisp&&!w.fly&&dragWisp!==w&&!inPair){
   if(!w.wander){w.idle-=dt;if(w.idle<=0){const W=canvas.clientWidth,H=canvas.clientHeight,others=allWisps().filter(o=>o!==w&&o!==hostWisp);let x1,y1,tgt=null;if(others.length&&Math.random()<.65){tgt=others[Math.floor(Math.random()*others.length)];const a=Math.random()*6.28,r=74+Math.random()*36;x1=tgt.nodes[0].x+Math.cos(a)*r;y1=tgt.nodes[0].y+Math.sin(a)*r*.7}else{x1=70+Math.random()*Math.max(60,W-140);y1=70+Math.random()*Math.max(60,H*.55)}w.wander={ph:"go",t0:performance.now(),dur:2100+Math.random()*700,x0:w.nodes[0].x,y0:w.nodes[0].y,x1,y1,tgt,ang:Math.random()*6.28,until:0}}}
   else if(w.wander.ph==="go"&&performance.now()-w.wander.t0>=w.wander.dur){w.wander.ph="stay";w.wander.until=performance.now()+2200+Math.random()*2200}
   else if(w.wander.ph==="stay"&&performance.now()>=w.wander.until){w.wander={ph:"back",t0:performance.now(),dur:2000,x0:w.nodes[0].x,y0:w.nodes[0].y,x1:w.homeX,y1:w.homeY,tgt:null,ang:0,until:0}}
   else if(w.wander.ph==="back"&&performance.now()-w.wander.t0>=w.wander.dur){w.wander=null;w.idle=6+Math.random()*12}}}
 if(w.fly){const f=w.fly,e=Math.min(1,(performance.now()-f.t0)/850),ee=e<.5?2*e*e:1-Math.pow(-2*e+2,2)/2;tx=f.x0+(f.cx-f.x0)*ee+(f.x1-f.cx)*ee*ee;ty=f.y0+(f.cy-f.y0)*ee+(f.y1-f.cy)*ee*ee - Math.sin(ee*Math.PI)*24;if(e>=1){w.state="INTERACTING";w.fly=null;if(pair){pair.since=performance.now();if(pair.autoFx!=null&&pair.effect==null){pair.effect=pair.autoFx;pair.burstDone=false}}}}else if(w.wander){const f=w.wander;if(f.tgt&&f.ph!=="back"){f.x1=f.tgt.nodes[0].x+Math.cos(f.ang)*84;f.y1=f.tgt.nodes[0].y+Math.sin(f.ang)*58;f.ang+=dt*.35}
 if(f.ph==="stay"){tx=f.x1+Math.cos(t*1.3+w.phase)*7;ty=f.y1+Math.sin(t*1.7+w.phase)*6}else{const e2=Math.min(1,(performance.now()-f.t0)/f.dur),ee2=e2<.5?2*e2*e2:1-Math.pow(-2*e2+2,2)/2;tx=f.x0+(f.x1-f.x0)*ee2;ty=f.y0+(f.y1-f.y0)*ee2-Math.sin(ee2*Math.PI)*20}}else if(dragWisp===w){tx=mouse.x;ty=mouse.y}else{tx=home.x;ty=home.y}
 const n=w.nodes,k=w.scale,damp=ENV_DAMP[window._env||0];
 const vx=(tx-n[0].x)*.08,vy=(ty-n[0].y)*.08;n[0].px=n[0].x;n[0].py=n[0].y;n[0].x+=vx;n[0].y+=vy;
 for(let i=1;i<5;i++){const nd=n[i],pvx=(nd.x-nd.px)*damp,pvy=(nd.y-nd.py)*damp;nd.px=nd.x;nd.py=nd.y;nd.x+=pvx+ENV_WIND[window._env||0]*.06*(1+gust*2.5)*Math.sin(t*1.3+i);nd.y+=pvy+.12}
 for(let it=0;it<3;it++)for(let i=1;i<5;i++){const a=n[i-1],b=n[i],want=SEG[i-1]*k*(p.seg||1);let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;const diff=(d-want)/d;b.x-=dx*diff*(i===1?.2:.5);b.y-=dy*diff*(i===1?.2:.5);
  if(i>1){const pa=Math.atan2(n[i-1].y-n[i-2].y,n[i-1].x-n[i-2].x);let ca=Math.atan2(b.y-a.y,b.x-a.x),dd=ca-pa;while(dd>Math.PI)dd-=2*Math.PI;while(dd<-Math.PI)dd+=2*Math.PI;const lim=32*Math.PI/180;if(Math.abs(dd)>lim){ca=pa+Math.sign(dd)*lim;b.x=a.x+Math.cos(ca)*want;b.y=a.y+Math.sin(ca)*want}}}
 w.pose=p;
 {const d={x:n[1].x-n[0].x,y:n[1].y-n[0].y},l=Math.hypot(d.x,d.y)||1,dx=d.x/l,dy=d.y/l;
  w.rig={dx,dy,px:-dy,py:dx,headAngle:Math.atan2(dy,dx)-Math.PI/2};
  const t4={x:n[4].x-n[3].x,y:n[4].y-n[3].y},tl=Math.hypot(t4.x,t4.y)||1,tx=t4.x/tl,ty=t4.y/tl,qx=-ty,qy=tx,R=RAD[4]*k;
  const anchors=[];for(let i=0;i<5;i++){const f=i/4,tip=[0,6,16,6,0][i]*k;anchors.push({x:n[4].x+qx*R*(1-f*2)+tx*tip,y:n[4].y+qy*R*(1-f*2)+ty*tip})}
  if(!w.tailPts)w.tailPts=anchors.map(a=>({x:a.x,y:a.y,px:a.x,py:a.y}));
  w.tailPts.forEach((pt,i)=>{const a=anchors[i],vx=(pt.x-pt.px)*.88,vy=(pt.y-pt.py)*.88;pt.px=pt.x;pt.py=pt.y;pt.x+=vx+(a.x-pt.x)*.34+ENV_WIND[window._env||0]*.08*(1+gust*2);pt.y+=vy+(a.y-pt.y)*.34+.1});
  for(let it=0;it<2;it++)for(let i=1;i<5;i++){const A=w.tailPts[i-1],B=w.tailPts[i],restA=Math.hypot(anchors[i].x-anchors[i-1].x,anchors[i].y-anchors[i-1].y);let ddx=B.x-A.x,ddy=B.y-A.y,dd=Math.hypot(ddx,ddy)||1,diff=(dd-restA)/dd*.5;A.x+=ddx*diff;A.y+=ddy*diff;B.x-=ddx*diff;B.y-=ddy*diff}
  w.tailAnchors=anchors}
 gust=(window._env===3)?Math.max(0,Math.sin(t*(2*Math.PI/4.5)))*( (t%4.5)<1.2?1:0.15):0;
 if((w.fly||dragWisp===w||(w.wander&&w.wander.ph!=="stay"))&&Math.random()<.55){const en=n[Math.floor(Math.random()*5)];fx.push({x:en.x+(Math.random()-.5)*12,y:en.y+(Math.random()-.5)*8,vx:(Math.random()-.5)*.35,vy:-.15-Math.random()*.3,life:1,soft:true,c:wispTint(w),r:1.3+Math.random()*1.3,star:Math.random()<.3,spin:Math.random()*3})};
 if(pair&&!pair.effect&&(pair.a===w||pair.b===w)){const o=pair.a===w?pair.b:pair.a,midx=(n[0].x+o.nodes[0].x)/2,midy=(n[0].y+o.nodes[0].y)/2,dirx=Math.sign(o.nodes[0].x-n[0].x)||1;
  w.pairOx=dirx*7+Math.sin(t*2.2)*2;w.pairHands={L:{x:midx-dirx*4,y:midy-6+Math.sin(t*3.1)*3},R:{x:midx+dirx*4,y:midy-2+Math.cos(t*3.1)*3}};w.pose.oy=(w.pose.oy||0)+Math.sin(t*3.1+(pair.b===w?Math.PI:0))*2.5}
 if(pair&&pair.effect!=null){const el=performance.now()-pair.since,o=pair.a===w?pair.b:pair.a;
  if(el<2600){const midx=(n[0].x+o.nodes[0].x)/2,midy=(n[0].y+o.nodes[0].y)/2,dirx=Math.sign(o.nodes[0].x-n[0].x)||1;
   if(pair.effect===0){w.pairOx=dirx*18+Math.sin(el*.004)*4;w.pairHands={L:{x:o.nodes[1].x-14,y:o.nodes[1].y},R:{x:o.nodes[1].x+14,y:o.nodes[1].y}};if(!pair.burstDone){pair.burstDone=true;fx.push({x:midx,y:midy,life:1,c:"#fda4af",r:6,ring:true,vx:0,vy:0});for(let i2=0;i2<10;i2++)fx.push({x:midx,y:midy-14,vx:(Math.random()-.5)*1.7,vy:-.5-Math.random(),life:1,c:"#fda4af",r:3,heart:true})}if(Math.random()<.08)fx.push({x:midx,y:midy-20,vx:(Math.random()-.5)*.8,vy:-.7,life:1,c:"#fda4af",r:3,heart:true})}
   if(pair.effect===1){w.pairOx=el<400?-dirx*8:0;w.pairHands={L:{x:midx,y:midy-18},R:{x:midx,y:midy-18}};if(el>=400&&!pair.burstDone){pair.burstDone=true;fx.push({x:midx,y:midy-18,life:1,c:"#fef08a",r:6,ring:true,vx:0,vy:0});for(let i=0;i<22;i++)fx.push({x:midx,y:midy-18,vx:Math.cos(i/22*6.28)*2.4,vy:Math.sin(i/22*6.28)*2.4,life:1,c:"#fef08a",r:2.4,star:i%2===0,spin:Math.random()*3})}if(el>=400)w.pose.oy=-20*Math.abs(Math.sin(el*.006))}
   if(pair.effect===2){w.pairHands={L:{x:midx,y:midy},R:{x:midx+6,y:midy+4}};o.goldRim=true;if(el%600<18)fx.push({x:midx,y:midy+6,life:1,c:"#fbbf24",r:5,halo:true,vx:0,vy:-.15});if(Math.random()<.25)fx.push({x:midx,y:midy,vx:(Math.random()-.5)*.5,vy:-.5,life:1,c:"#fbbf24",r:2.2})}
   if(pair.effect===3){w.pairOx=dirx*8;w.forceEye=3;if(el%500<18)fx.push({x:midx,y:midy,life:1,c:"#bae6fd",r:6,ring:true,vx:0,vy:0});if(Math.random()<.06)fx.push({x:o.nodes[0].x+14,y:o.nodes[0].y-24,vx:.25,vy:-.55,life:1,c:"#bae6fd",r:3,zzz:true})}
   if(pair.effect===4){w.forceMime=[5,2,4][Math.floor(el/800)%3];if(Math.random()<.09)fx.push({x:midx+(Math.random()<.5?-16:16),y:midy-26,vx:(Math.random()-.5)*.4,vy:-.6,life:1,c:"#fde68a",r:3,note:true});if(Math.random()<.05)fx.push({x:midx,y:midy-10,vx:(Math.random()-.5),vy:-.4,life:1,c:"#fef08a",r:2.2,star:true,spin:1})}
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

const faceTexCache={};
function getFaceTexture(style,closed=false){const img=eyeImgs[style];const key=style+(closed?"_closed":"")+(img&&img.complete?"_ready":"_wait");if(faceTexCache.key===key&&faceTexCache.tex)return faceTexCache.tex;
 const c=document.createElement("canvas");c.width=104;c.height=52;const g=c.getContext("2d");
 g.fillStyle="rgba(244,114,182,.38)";g.beginPath();g.ellipse(24,32,11,6.5,0,0,7);g.ellipse(80,32,11,6.5,0,0,7);g.fill();
 if(closed){g.strokeStyle="#1f2937";g.lineWidth=3;g.lineCap="round";g.beginPath();g.moveTo(28,20);g.quadraticCurveTo(38,25,48,20);g.moveTo(56,20);g.quadraticCurveTo(66,25,76,20);g.stroke()}
 else if(img&&img.complete&&img.naturalWidth)g.drawImage(img,20,6,64,32);
 else{g.fillStyle="#1f2937";g.beginPath();g.arc(38,20,4.5,0,7);g.arc(66,20,4.5,0,7);g.fill()}
 g.strokeStyle="rgba(31,41,55,.75)";g.lineWidth=2;g.beginPath();g.arc(52,34,5,Math.PI*.15,Math.PI*.85);g.stroke();
 faceTexCache.key=key;faceTexCache.tex=c;return c}

let hairImgs={},facialImgs={},hairShapeImgs={},tintCache={};
function getTinted(img,color){if(!img||!img.complete||!img.naturalWidth)return null;const key=img.src+"|"+color;if(tintCache[key])return tintCache[key];const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext("2d");g.drawImage(img,0,0);g.globalCompositeOperation="source-in";g.fillStyle=color;g.fillRect(0,0,c.width,c.height);tintCache[key]=c;return c}
function wispTint(w){return w.soul.bodyColor||TINTS[((w.soul.appearance||0)>>4)%5]}
function drawWisp(w,t){const s=w.soul,k=w.scale,n=w.nodes,p=w.pose||pose(w,t),{pts,hem}=contour(w);
 const headTan={x:n[1].x-n[0].x,y:n[1].y-n[0].y},htl=Math.hypot(headTan.x,headTan.y)||1,hx=headTan.x/htl,hy=headTan.y/htl,px=-hy,py=hx;
 const headArc=[0,.25,.5,.75,1].map(f=>{const a=f*Math.PI;return{x:n[0].x+(px*Math.cos(a)-hx*Math.sin(a))*RAD[0]*k,y:n[0].y+(py*Math.cos(a)-hy*Math.sin(a))*RAD[0]*k}});
 const hull=[...headArc.reverse(),...pts.slice(1).map(q=>({x:q.lx,y:q.ly})),...hem,...pts.slice(0,4).reverse().map(q=>({x:q.rx,y:q.ry}))];
 const path=new Path2D(smoothPath(hull));
 const tint=s.bodyColor||TINTS[(s.appearance>>4)%5];
 ctx.save();ctx.globalCompositeOperation="screen";const au=ctx.createRadialGradient(n[0].x,n[0].y,4,n[0].x,n[0].y,65*k);au.addColorStop(0,tint);au.addColorStop(1,"transparent");ctx.globalAlpha=.15+.15*Math.sin(t*2*Math.PI*.8+w.phase);ctx.fillStyle=au;ctx.beginPath();ctx.arc(n[0].x,n[0].y,65*k,0,7);ctx.fill();ctx.restore();
 const shoulder=(side)=>{const d={x:n[2].x-n[1].x,y:n[2].y-n[1].y},l=Math.hypot(d.x,d.y)||1,dx=d.x/l,dy=d.y/l;return{x:n[1].x+(dy)*side*20*k+dx*-2*k,y:n[1].y+(-dx)*side*20*k+dy*-2*k}};
 const handWorld=(h,side)=>{if(w.pairHands)return side<0?w.pairHands.L:w.pairHands.R;return{x:n[0].x+h[0]*k,y:n[0].y+h[1]*k}};
 const drawArm=(side,rawTarget,onTop)=>{const sh=shoulder(side);const maxLen=32*k-.5;let tdx=rawTarget.x-sh.x,tdy=rawTarget.y-sh.y;const td=Math.hypot(tdx,tdy)||1;if(td>maxLen){tdx*=maxLen/td;tdy*=maxLen/td}const target={x:sh.x+tdx,y:sh.y+tdy},sol=ik(sh.x,sh.y,target.x,target.y,17*k,15*k,side);
 if(!w.armChains)w.armChains={};const key=side<0?"L":"R";let ch=w.armChains[key];
 if(!ch||ch.length!==4){ch=w.armChains[key]=Array.from({length:4},(_,i)=>({x:sh.x+(target.x-sh.x)*i/3,y:sh.y+(target.y-sh.y)*i/3,px:sh.x,py:sh.y}))}
 const rest=(32*k)/3,mid={x:(sh.x+target.x)/2,y:(sh.y+target.y)/2},fdx=target.x-sh.x,fdy=target.y-sh.y,fl=Math.hypot(fdx,fdy)||1,qx=-fdy/fl,qy=fdx/fl,bend=side*13*k;
 ch[0].x=sh.x;ch[0].y=sh.y;
 for(let i=1;i<4;i++){const pt=ch[i],vx=(pt.x-pt.px)*.86,vy=(pt.y-pt.py)*.86;pt.px=pt.x;pt.py=pt.y;pt.x+=vx+ENV_WIND[window._env||0]*.05;pt.y+=vy+.12;
  const gi=i/3,gx=sh.x+fdx*gi+qx*bend*2*gi*(1-gi),gy=sh.y+fdy*gi+qy*bend*2*gi*(1-gi);pt.x+=(gx-pt.x)*.16;pt.y+=(gy-pt.y)*.16}
 ch[3].x+=(target.x-ch[3].x)*.55;ch[3].y+=(target.y-ch[3].y)*.55;
 for(let it=0;it<4;it++){for(let i=1;i<4;i++){const A=ch[i-1],B=ch[i];let ddx=B.x-A.x,ddy=B.y-A.y,dd=Math.hypot(ddx,ddy)||1;B.x=A.x+ddx/dd*rest;B.y=A.y+ddy/dd*rest}ch[3].x=target.x;ch[3].y=target.y;for(let i=2;i>=0;i--){const A=ch[i],B=ch[i+1];let ddx=A.x-B.x,ddy=A.y-B.y,dd=Math.hypot(ddx,ddy)||1;A.x=B.x+ddx/dd*rest;A.y=B.y+ddy/dd*rest}ch[0].x=sh.x;ch[0].y=sh.y}
 sol.hx=target.x;sol.hy=target.y;sol.ex=ch[2].x;sol.ey=ch[2].y;
 const widths=[6.5,5.4,3.6,.4],left=[],right=[];
 for(let i=0;i<4;i++){const A=ch[Math.max(0,i-1)],B=ch[Math.min(3,i+1)];let tx=B.x-A.x,ty=B.y-A.y;const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;const wd=widths[i]*k;left.push({x:ch[i].x-ty*wd,y:ch[i].y+tx*wd});right.push({x:ch[i].x+ty*wd,y:ch[i].y-tx*wd})}
 const ag=ctx.createLinearGradient(sh.x,sh.y,target.x,target.y);const tRgb=parseInt(tint.slice(1),16),tR=(tRgb>>16)&255,tG=(tRgb>>8)&255,tB=tRgb&255;ag.addColorStop(0,`rgba(${tR},${tG},${tB},0)`);ag.addColorStop(.22,`rgba(${tR},${tG},${tB},.88)`);ag.addColorStop(1,`rgba(${tR},${tG},${tB},.96)`);
 ctx.fillStyle=ag;ctx.fill(new Path2D(smoothPath([...left,...right.reverse()])));return sol};
 
 const grad=ctx.createLinearGradient(n[0].x,n[0].y-26*k,n[4].x,n[4].y);grad.addColorStop(0,tint);grad.addColorStop(1,tint+"66");ctx.globalAlpha=.95;ctx.fillStyle=grad;ctx.fill(path);ctx.globalAlpha=1;
 const blinkAge=(performance.now()-w.blinkPh)/140,blinkScale=blinkAge<1?Math.abs(Math.cos(blinkAge*Math.PI))*.95+.05:1;
 ctx.save();ctx.translate(n[0].x,n[0].y);ctx.rotate((w.rig?w.rig.headAngle:0)+(p.headTilt||0)*Math.PI/180*.5);ctx.translate(w.gaze.x*k,-4*k+w.gaze.y*k);
 ctx.save();ctx.scale(w.gaze.x>5?.82:1,1);const isBlinking=blinkAge>=0&&blinkAge<1;const faceTex=getFaceTexture(w.forceEye!=null?w.forceEye:(s.appearance&15)%10,isBlinking);ctx.drawImage(faceTex,-26*k,-13*k,52*k,26*k);ctx.restore();ctx.restore();
 const hatIdx=(s.item_and_hat&15)%11;if(hatIdx){ctx.save();ctx.translate(n[0].x,n[0].y);ctx.rotate((w.rig?w.rig.headAngle:0)+(p.headTilt||0)*Math.PI/180*.5);ctx.translate(-w.gaze.x*.2*k,-24*k+Math.max(-2,Math.min(4,w.hatSpring.y)));const hi=hatImgs[hatIdx-1];ctx.font=`${22*k}px system-ui`;ctx.textAlign="center";if(hi&&hi.complete)ctx.drawImage(hi,-13*k,-22*k,26*k,26*k);else ctx.fillText(HATS[hatIdx],0,0);ctx.restore()}
 ctx.strokeStyle=(w.goldRim||s.host_react===3)?"rgba(251,191,36,.85)":"rgba(255,255,255,.6)";ctx.lineWidth=2.5*k;ctx.beginPath();ctx.arc(n[0].x,n[0].y,24*k,Math.PI*1.05,Math.PI*1.55);ctx.stroke();
 drawArm(1,handWorld(p.handR,1),false);const frontSol=drawArm(-1,handWorld(p.handL,-1),true);
 const itemIdx=(s.item_and_hat>>4)%6;if(itemIdx){const dangles=itemIdx>=4;ctx.save();ctx.translate(frontSol.hx,frontSol.hy);ctx.rotate(dangles?w.pend:(Math.atan2(frontSol.hy-frontSol.ey,frontSol.hx-frontSol.ex)+.78));const ii=itemImgs[itemIdx-1];if(ii&&ii.complete)ctx.drawImage(ii,-11*k,0,22*k,22*k);else{ctx.font=`${16*k}px system-ui`;ctx.textAlign="center";ctx.fillText(ITEMS[itemIdx],0,14*k)}ctx.restore();
  if(itemIdx>=3&&Math.random()<.35){const gc=window._manifest?.items?.[itemIdx-1]?.glowColor||"#fbbf24";fx.push({x:frontSol.hx,y:frontSol.hy+8*k,vx:(Math.random()-.5)*.7,vy:-.4-Math.random()*.6,life:1,c:gc,r:1.6+Math.random()*1.6})}
  if(itemIdx>=4){ctx.save();ctx.globalCompositeOperation="screen";ctx.fillStyle="rgba(251,191,36,.25)";ctx.beginPath();ctx.arc(frontSol.hx,frontSol.hy+10*k,16*k,0,7);ctx.fill();ctx.restore()}}
 if(w.guest){ctx.fillStyle="#f5c451";ctx.beginPath();ctx.arc(n[0].x,n[0].y-36*k,3,0,7);ctx.fill()}
 if(s.host_react){const a=t*1.2+s.visitor_id;ctx.fillStyle="#fde68a";ctx.font="13px system-ui";ctx.textAlign="center";ctx.fillText("✦",n[0].x+Math.cos(a)*30*k,n[0].y-18*k+Math.sin(a)*8*k)}
 if(w.rip>0){ctx.strokeStyle=`rgba(255,255,255,${w.rip})`;ctx.beginPath();ctx.arc(n[0].x,n[0].y,(1-w.rip)*44+12,0,7);ctx.stroke()}}
function makeParticles(){const n=PART_N[window._env||0];particles=Array.from({length:n},()=>({x:Math.random()*canvas.clientWidth,y:Math.random()*canvas.clientHeight,s:.5+Math.random()*2,v:.2+Math.random()*.8,ph:Math.random()*7}));
}
function drawProps(t){const W=canvas.clientWidth,H=canvas.clientHeight,e=window._env||0;
 if(e===5){ctx.fillStyle="rgba(125,211,252,.5)";for(let i=0;i<26;i++){const x=(i*67+t*18)%W,y=H-36+Math.sin(i*2.1+t*1.26)*5;ctx.fillRect(x,y,2.4,2.4)}}}
function drawFx(dt){for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt*(f.soft?.38:.7);if(f.life<=0){fx.splice(i,1);continue}f.x+=f.vx;f.y+=f.vy;if(f.ring){f.r+=dt*46;ctx.strokeStyle=`rgba(186,230,253,${f.life*.7})`;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.stroke()}else if(f.halo){f.r+=dt*30;ctx.strokeStyle=`rgba(251,191,36,${f.life*.8})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(f.x,f.y,f.r,f.r*.45,0,0,7);ctx.stroke()}else if(f.star){f.spin=(f.spin||0)+dt*3;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.spin);ctx.globalAlpha=Math.max(0,f.life);ctx.fillStyle=f.c;const r=f.r*2.2;ctx.beginPath();for(let j=0;j<8;j++){const a=j*Math.PI/4,rr=j%2?r*.38:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.restore();ctx.globalAlpha=1}else if(f.note||f.zzz){ctx.globalAlpha=Math.max(0,f.life);ctx.fillStyle=f.c;ctx.font=`${f.zzz?13:15}px system-ui`;ctx.textAlign="center";ctx.fillText(f.note?"\u266A":"Z",f.x,f.y);ctx.globalAlpha=1}else{ctx.globalAlpha=Math.max(0,f.life);ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill();ctx.globalAlpha=1;if(f.heart){ctx.fillStyle=f.c;ctx.font="10px system-ui";ctx.fillText("\u2665",f.x-4,f.y-4)}}}}
function cover(img,W,H,ox,oy,extra=1.06){if(!img||!img.complete||!img.naturalWidth)return false;const sc=Math.max((W+170)/img.naturalWidth,(H+110)/img.naturalHeight)*extra,dw=img.naturalWidth*sc,dh=img.naturalHeight*sc;ctx.drawImage(img,(W-dw)/2+ox,(H-dh)/2+oy,dw,dh);return true}
const fgFadeCache={};
function fadedFg(img){if(!img||!img.complete||!img.naturalWidth)return null;if(fgFadeCache[img.src])return fgFadeCache[img.src];const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext("2d");g.drawImage(img,0,0);g.globalCompositeOperation="destination-in";const gr=g.createLinearGradient(0,0,0,c.height);gr.addColorStop(0,"rgba(0,0,0,0)");gr.addColorStop(.45,"rgba(0,0,0,1)");g.fillStyle=gr;g.fillRect(0,0,c.width,c.height);fgFadeCache[img.src]=c;return c}
function drawEnv(t){const W=canvas.clientWidth,H=canvas.clientHeight,e=window._env||0;
 const tx=(mouse.x/W-.5)||0,ty=(mouse.y/H-.5)||0;parX+=(tx-parX)*.03;parY+=(ty-parY)*.03;
 const drift=Math.sin(t*.07)*5;
 if(bgFar[e]&&bgFar[e].complete){cover(bgFar[e],W,H,-parX*6+Math.sin(t*.021)*7,-parY*3+Math.cos(t*.017)*3,1.08);cover(bgImgs[e],W,H,-parX*13-Math.sin(t*.016)*9,-parY*6-Math.cos(t*.013)*4,1.07);ctx.fillStyle="rgba(8,10,22,.10)";ctx.fillRect(0,0,W,H)}
 else{const skies=[["#071714","#13382e","#0a2019"],["#fdf6f0","#f7d6e0","#c8d9f8"],["#16697a","#0b3a54","#061a2e"],["#140d26","#8c3b2b","#d97f38"],["#0f203c","#4b3d60","#e8f1fc"],["#ff6b6b","#feca57","#2e1f47"]][e];const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,skies[0]);g.addColorStop(.55,skies[1]);g.addColorStop(1,skies[2]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="rgba(255,255,255,.75)";if(e===3||e===4)for(let i=0;i<50;i++)ctx.fillRect((i*97)%W,(i*57)%(H*.5),1.6,1.6);
 if(e===3){ctx.fillStyle="#fef3c7";ctx.beginPath();ctx.arc(W*.82,H*.16,26,0,7);ctx.fill()}
 if(e===1){ctx.save();ctx.globalAlpha=.14;ctx.fillStyle="#fff";for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(W*(.15+i*.25),0);ctx.lineTo(W*(.3+i*.25),0);ctx.lineTo(W*(.45+i*.25),H);ctx.lineTo(W*(.2+i*.25),H);ctx.fill()}ctx.restore()}
 if(e===4){ctx.strokeStyle="rgba(110,231,183,.55)";ctx.lineWidth=10;ctx.beginPath();for(let x=0;x<=W;x+=16)ctx.lineTo(x,40+Math.sin(x*.012+t)*16);ctx.stroke()}
 if(e===2){ctx.strokeStyle="rgba(125,211,252,.16)";for(let i=0;i<24;i++){ctx.beginPath();ctx.arc((i*83)%W,(i*37)%(H*.33),18+((i*13)%22),0,7);ctx.stroke()}}
 ctx.fillStyle="rgba(0,0,0,.28)";ctx.beginPath();ctx.moveTo(0,H);if(e===3){ctx.lineTo(0,H*.72);ctx.bezierCurveTo(W*.3,H*.58,W*.6,H*.8,W,H*.66)}else if(e===5){ctx.lineTo(0,H*.8);ctx.bezierCurveTo(W*.3,H*.74+Math.sin(t*.8)*7,W*.7,H*.84,W,H*.78)}else{ctx.lineTo(0,H*.78);ctx.lineTo(W*.18,H*.62);ctx.lineTo(W*.38,H*.78);ctx.lineTo(W*.62,H*.6);ctx.lineTo(W*.84,H*.76);ctx.lineTo(W,H*.64)}ctx.lineTo(W,H);ctx.fill()}
 for(const pt of particles){pt.y+= (e===4? pt.v*1.4 : e===0||e===2? -pt.v : pt.v*.35);pt.x+=Math.sin(t+pt.ph)*.4+(e===3?1.1:e===5?.3:0);if(pt.y<0)pt.y=H;if(pt.y>H)pt.y=0;if(pt.x>W)pt.x=0;ctx.fillStyle=e===0?"rgba(255,203,107,.9)":e===2?"rgba(186,230,253,.65)":"rgba(255,255,255,.8)";ctx.beginPath();ctx.arc(pt.x,pt.y,pt.s,0,7);ctx.fill()}
 if(!Number.isFinite(parX))parX=0;if(!Number.isFinite(parY))parY=0;const fg=(W>0&&H>0)?fadedFg(bgFg[e]):null;if(fg&&fg.width>0&&fg.height>0){const fh=H*.34;ctx.globalAlpha=.94;ctx.drawImage(fg,-parX*26+drift,H-fh,W*1.04,fh);ctx.globalAlpha=1}
 const fgI=bgFg[e],nearI=bgNear[e];
 if(fgI&&fgI.complete&&fgI.naturalWidth){const dw=W+190,dh=dw*fgI.naturalHeight/fgI.naturalWidth;ctx.drawImage(fgI,-95-parX*38+Math.sin(t*.11)*8,-40-parY*10,dw,Math.max(dh,H+80))}
 if(nearI&&nearI.complete&&nearI.naturalWidth){const nw=W+210,nh=nw*nearI.naturalHeight/nearI.naturalWidth;ctx.globalAlpha=.97;ctx.drawImage(nearI,-105-parX*54-Math.sin(t*.13)*10,H-nh+8,nw,nh);ctx.globalAlpha=1}
 const vg=ctx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.85);vg.addColorStop(0,"transparent");vg.addColorStop(1,"rgba(0,0,0,.30)");ctx.fillStyle=vg;ctx.fillRect(0,0,W,H)}
let lastT=0;
function frame(now){try{frameBody(now)}catch(err){console.warn(err.stack||err)}requestAnimationFrame(frame)}
function frameBody(now){const t=now/1000,dt=Math.min(.05,(now-lastT)/1000||.016);lastT=now;beatT+=dt;if(beatT>=1.2){beatT=0;beat++}
 if(canvas.clientWidth&&canvas.width!==canvas.clientWidth*devicePixelRatio){canvas.width=canvas.clientWidth*devicePixelRatio;canvas.height=canvas.clientHeight*devicePixelRatio}
 ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);drawEnv(t);
 drawProps(t);
const list=allWisps().filter(w=>w!==hostWisp).sort((a,b)=>a.nodes[0].y-b.nodes[0].y);for(const w of list){if(!w.homeX){w.homeX=w.nodes[0].x;w.homeY=w.nodes[0].y}stepWisp(w,t,dt);if(w.rip>0)w.rip-=.02;drawWisp(w,t)}drawFx(dt);
 if(pair&&orbs.length){for(const o of orbs){o.y+=Math.sin(t*2+o.i)*.3;const oi=orbImgs[o.i];if(oi&&oi.complete&&oi.naturalWidth)ctx.drawImage(oi,o.x-24,o.y-24,48,48);else{ctx.fillStyle="rgba(253,224,171,.92)";ctx.beginPath();ctx.arc(o.x,o.y,21,0,7);ctx.fill();ctx.strokeStyle="rgba(255,223,148,.9)";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#7c2d12";ctx.font="16px system-ui";ctx.textAlign="center";ctx.fillText(o.icon,o.x,o.y+5)}}}}
async function load(){if(!sid){$("#empty").hidden=false;return}$("#empty").hidden=true;const h={};const sec=hostSecret();if(sec)h["X-Host-Secret"]=sec;let r=await fetch(`/api/s/${sid}`,{headers:h});
 if(r.status===404){const sec2=hostSecret();
  if(sec2){const cr=await fetch("/api/sanctuaries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({host_secret:sec2,env_id:window._env||0,host_ghost:window._hostGhost||[0x01,0,0,1,2,1,0]})});const cj=await cr.json().catch(()=>({}));
   if(cr.ok&&cj.id===sid){toast("Sanctuary restored after server restart. Visiting souls were held in memory and are gone.");r=await fetch(`/api/s/${sid}`,{headers:h})}}
  if(!r.ok){$("#empty").hidden=false;$("#empty").textContent="This sanctuary no longer exists on the server. Open a new one or ask the host for a fresh link.";toast("Sanctuary not found");return}}const p=decodePacket(await r.arrayBuffer());try{const cm=await(await fetch(`/api/s/${sid}/colors`)).json();for(const so of p.souls){const cc=cm[so.visitor_id];if(cc){if(cc[0])so.bodyColor=cc[0];if(cc[1])so.hairColor=cc[1]}}}catch{}
window._env=p.env;window._hostGhost=p.hostGhost;souls=p.souls;syncWisps();makeParticles();const guest=isGuest();const myW=wisps.get(myVid());if(myW)myW.guest=guest;$("#roleBadge").textContent=isHost()?"host":guest?"guest":"visitor";$("#roleBadge").classList.toggle("host",isHost());
 const lb=$("#limboBtn"),visitorNoWisp=!!sid&&!isHost()&&!guest;
 if(visitorNoWisp){lb.innerHTML=ICON_LOCK;lb.disabled=false;lb.dataset.mode="lock";lb.title="Host unlock";lb.setAttribute("aria-label","Host unlock")}
 else{lb.innerHTML=ICON_GHOST;lb.disabled=guest;lb.dataset.mode="limbo";lb.title="Enter Limbo";lb.setAttribute("aria-label","Enter Limbo")}$("#envWrap").hidden=!isHost();$("#envSel").value=p.env;updateOpenBtn();
 try{const meta=await(await fetch(`/api/s/${sid}/meta`)).json();if(!window._gateChecked){window._gateChecked=true;if(meta.locked&&!isHost()&&!isGuest())$("#unlockGate").hidden=false}}catch{}}
async function createSanctuary(env,pw){const secret=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,"0")).join("");const r=await fetch("/api/sanctuaries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({host_secret:secret,password:pw||undefined,env_id:env||0,host_ghost:[0x01,0,0,1,2,1,0]})});const j=await r.json();if(!r.ok){toast(j.error||"create failed");return}localStorage.setItem("wispn_host_"+j.id,secret);localStorage.setItem("wispn_my_sanctuary",j.id);sid=j.id;location.hash=sid;await load();return sid}
function currentSoul(){const nearest=(hex,arr)=>{let best=0,bd=1e12;const v=parseInt(hex.slice(1),16);arr.forEach((c,i)=>{const w=parseInt(c.slice(1),16),d=((v>>16)-(w>>16))**2+(((v>>8)&255)-((w>>8)&255))**2+((v&255)-(w&255))**2;if(d<bd){bd=d;best=i}});return best};
 return{visitor_id:myVid()||999999,appearance:(nearest(CUST.bodyColor,TINTS)<<4)|CUST.eyes,item_and_hat:(CUST.item<<4)|CUST.hat,mime_seq:[+$("#fBeat0").value,+$("#fBeat1").value,+$("#fBeat2").value],mime_tempo:+$("#fTempo").value,arm_gesture:CUST.gesture,facial:0,packed_tempo:(+$("#fTempo").value)|(CUST.gesture<<2),host_react:0,hair:(nearest(CUST.hairColor,HAIR_COLORS)<<4)|CUST.hair,bodyColor:CUST.bodyColor,hairColor:CUST.hairColor}}
let heroWisp=null;let AC=null;function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(_){}}if(AC&&AC.state==="suspended")AC.resume();return AC}
function tone(f,d=.09,type="sine",g=.045,delay=0,slide=0){const c=ac();if(!c)return;const t0=c.currentTime+delay,o=c.createOscillator(),gn=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t0+d);gn.gain.setValueAtTime(0,t0);gn.gain.linearRampToValueAtTime(g,t0+.012);gn.gain.exponentialRampToValueAtTime(.0008,t0+d);o.connect(gn);gn.connect(c.destination);o.start(t0);o.stop(t0+d+.02)}
const sfx={tap(){tone(740,.08,"sine",.04);tone(1180,.06,"sine",.025,.03)},react(){[523,659,784,1046].forEach((f,i)=>tone(f,.12,"triangle",.04,i*.055))},save(){[392,523,659,784].forEach((f,i)=>tone(f,.14,"sine",.04,i*.06))},orb(){tone(1318,.07,"sine",.03)},click(){tone(520,.05,"triangle",.025)},fly(){tone(420,.28,"sine",.018,0,880)}};
const closetImg=new Image();closetImg.src="/assets/ui/closet.jpg";
function openLimbo(){if(sid&&!isHost()&&!isGuest()&&!pendingNew){$("#unlockGate").hidden=false;return}if(isGuest()&&!pendingNew){toast("You are visiting as a guest ghost. Limbo belongs to the host.");return}$("#limbo").hidden=false;$("#pwWrap").hidden=!(pendingNew||!sid);$("#envWrap").hidden=!(isHost()||pendingNew||!sid);heroWisp=makeWisp(currentSoul(),180,180,2);heroWisp.homeX=180;heroWisp.homeY=180;drawHero()}
function drawHero(){if($("#limbo").hidden||!heroWisp)return;const hctx=$("#hero").getContext("2d");heroWisp.soul=currentSoul();heroWisp.gaze.tx=Math.max(-8,Math.min(8,(mouse.x-180)*.04));heroWisp.gaze.ty=Math.max(-5,Math.min(5,(mouse.y-180)*.04));stepWisp(heroWisp,performance.now()/1000,.016);hctx.clearRect(0,0,360,360);if(closetImg.complete&&closetImg.naturalWidth){const sc=Math.max(360/closetImg.naturalWidth,360/closetImg.naturalHeight);hctx.drawImage(closetImg,(360-closetImg.naturalWidth*sc)/2,(360-closetImg.naturalHeight*sc)/2,closetImg.naturalWidth*sc,closetImg.naturalHeight*sc);hctx.fillStyle="rgba(20,12,30,.18)";hctx.fillRect(0,0,360,360)}else{hctx.fillStyle="#241d3d";hctx.fillRect(0,0,360,360)}const worldCtx=ctx;ctx=hctx;drawWisp(heroWisp,performance.now()/1000);ctx=worldCtx;requestAnimationFrame(drawHero)}
let pendingNew=false;
async function release(){if(pendingNew||!sid){const pw=$("#pwInput").value;if(!/^[\x20-\x7E]{4,32}$/.test(pw)){toast("Choose a password of 4-32 ASCII characters to lock your sanctuary");return}const nid=await createSanctuary(+$("#envSel").value||0,pw);if(!nid){toast("Could not open sanctuary");return}pendingNew=false}const limbo=$("#limbo");limbo.classList.add("crossing");const body={action:"summon",visitor_token:visitorToken(),appearance:currentSoul().appearance,item_and_hat:currentSoul().item_and_hat,mime_seq:currentSoul().mime_seq,mime_tempo:currentSoul().packed_tempo,hair:currentSoul().hair,body_color:CUST.bodyColor,hair_color:CUST.hairColor};const r=await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(r.ok)localStorage.setItem("wispn_my_vid",j.visitor_id);if(isHost())await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json","X-Host-Secret":hostSecret()},body:JSON.stringify({action:"host_update",env_id:+$("#envSel").value})});if(r.ok)sfx.save();setTimeout(async()=>{limbo.hidden=true;limbo.classList.remove("crossing");toast(r.ok?"Saved":"Summon failed");await load()},1100)}
function flyTo(a,b){sfx.fly();const dir=b.nodes[0].x>=a.nodes[0].x?1:-1;a.fly={t0:performance.now()+120,x0:a.nodes[0].x,y0:a.nodes[0].y,cx:(a.nodes[0].x+b.nodes[0].x)/2,cy:Math.min(a.nodes[0].y,b.nodes[0].y)-70,x1:b.nodes[0].x-dir*64,y1:b.nodes[0].y};a.state="FLYING";b.state="INTERACTING";pair={a,b,since:0};orbs=[];
 if(isHost()&&a===hostWisp){sfx.orb();orbs=["🤗","✋","🕯️","💫","💃"].map((icon,i)=>({i,icon,x:b.nodes[0].x-60+i*30,y:b.nodes[0].y-62}))}else if(pair)pair.autoFx=Math.floor(Math.random()*5)}
async function reactOrb(o){if(!pair)return;const visitor=pair.b.soul.visitor_id;await fetch(`/api/s/${sid}`,{method:"POST",headers:{"Content-Type":"application/json","X-Host-Secret":hostSecret()},body:JSON.stringify({action:"react",visitor_id:visitor,react:o.i+1})});pair.effect=o.i;pair.since=performance.now();pair.burstDone=false;orbs=[];sfx.react();toast("Shared "+["a hug","a high-five","light","a boop","a mirror dance"][o.i]);await load()}
let dragMoved=false,dragOff={x:0,y:0};
function evtPos(e){const r=canvas.getBoundingClientRect();const src=e.touches?e.touches[0]:e;return{x:src.clientX-r.left,y:src.clientY-r.top}}
function onDown(e){ac();mouse=evtPos(e);dragMoved=false;
 for(const o of orbs)if(Math.hypot(mouse.x-o.x,mouse.y-o.y)<27){reactOrb(o);return}
 const hit=allWisps().filter(w=>w!==hostWisp).find(w=>Math.hypot(mouse.x-w.nodes[0].x,mouse.y-w.nodes[0].y)<46);
 if(hit){dragWisp=hit;dragOff={x:mouse.x-hit.nodes[0].x,y:mouse.y-hit.nodes[0].y};canvas.style.cursor="grabbing";try{canvas.setPointerCapture&&e.pointerId!=null&&canvas.setPointerCapture(e.pointerId)}catch(_){} }}
function onMove(e){mouse=evtPos(e);if(dragWisp){dragMoved=true;mouse.x-=dragOff.x;mouse.y-=dragOff.y}for(const w of allWisps())if(Math.hypot(mouse.x-w.nodes[0].x,mouse.y-w.nodes[0].y)<44)w.rip=1}
function onUp(e){if(dragWisp){const wasDrag=dragMoved,w=dragWisp;canvas.style.cursor="grab";
 if(wasDrag){w.homeX=w.nodes[0].x;w.homeY=w.nodes[0].y}
 else if(!wasDrag&&hostWisp){const actor=isHost()?hostWisp:wisps.get(myVid());if(actor&&w!==actor){sfx.tap();for(let i2=0;i2<8;i2++)fx.push({x:w.nodes[0].x,y:w.nodes[0].y-10,vx:Math.cos(i2/8*6.28)*1.6,vy:Math.sin(i2/8*6.28)*1.6,life:1,c:"#fef08a",r:2.2,star:i2%2===0,spin:1});flyTo(actor,w)}}}
 dragWisp=null}
canvas.addEventListener("pointerdown",onDown);canvas.addEventListener("mousedown",e=>{if(!window.PointerEvent)onDown(e)});
canvas.addEventListener("pointermove",onMove);canvas.addEventListener("mousemove",e=>{if(!window.PointerEvent)onMove(e)});
canvas.addEventListener("touchstart",onDown,{passive:true});canvas.addEventListener("touchmove",onMove,{passive:true});
addEventListener("pointerup",onUp);addEventListener("mouseup",e=>{if(!window.PointerEvent)onUp(e)});addEventListener("touchend",onUp);
const ICON_LOCK='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none"/></svg>',ICON_GHOST='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3a7 7 0 0 0-7 7v11l2.3-1.6L9.6 21l2.4-1.6L14.4 21l2.3-1.6L19 21V10a7 7 0 0 0-7-7z"/><circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="10" r="1" fill="currentColor" stroke="none"/></svg>';
const ICON_PLUS='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',ICON_VISIT='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5"/><path d="M3 12h11M11 6l6 6-6 6" transform="translate(-1 0)"/></svg>';
function mySanctuary(){return localStorage.getItem("wispn_my_sanctuary")||Object.keys(localStorage).find(k=>k.startsWith("wispn_host_"))?.slice(11)||null}
function updateOpenBtn(){const own=mySanctuary(),b=$("#openBtn");if(own&&own!==sid){b.innerHTML=ICON_VISIT;b.dataset.mode="visit";b.title="Visit your sanctuary";b.setAttribute("aria-label","Visit your sanctuary")}else{b.innerHTML=ICON_PLUS;b.dataset.mode="new";b.title="New sanctuary";b.setAttribute("aria-label","New sanctuary")}}
$("#openBtn").onclick=()=>{sfx.click();const own=mySanctuary();if(own&&own!==sid){location.hash=own;sid=own;load();return}pendingNew=true;openLimbo()};$("#limboBtn").onclick=()=>{sfx.click();if($("#limboBtn").dataset.mode==="lock"){$("#unlockGate").hidden=false;return}pendingNew=false;openLimbo()};$("#shareBtn").onclick=()=>{sfx.click();navigator.clipboard?.writeText(location.href);toast("Link copied")};
$("#closeLimbo").onclick=()=>$("#limbo").hidden=true;$("#releaseBtn").onclick=release;
$("#unlockSkip").onclick=()=>{$("#unlockGate").hidden=true};
$("#gateCreate").onclick=()=>{$("#unlockGate").hidden=true;sfx.click();pendingNew=true;openLimbo()};
$("#unlockBtn").onclick=async()=>{const pw=$("#unlockPw").value;const r=await fetch(`/api/s/${sid}/unlock`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw})});const j=await r.json().catch(()=>({}));if(r.ok&&j.host_secret){localStorage.setItem("wispn_host_"+sid,j.host_secret);localStorage.setItem("wispn_my_sanctuary",sid);$("#unlockGate").hidden=true;sfx.save();toast("Sanctuary unlocked");await load()}else toast(j.error||"Wrong password")};
$("#hero").addEventListener("pointermove",e=>{const r=e.target.getBoundingClientRect();mouse={x:(e.clientX-r.left)*360/r.width,y:(e.clientY-r.top)*360/r.height}});
addEventListener("hashchange",()=>{sid=location.hash.slice(1)||null;load()});
(async()=>{let man=null;try{man=await(await fetch("/assets/manifest.json")).json()}catch{}
 const eyePaths=[0,1,2,3,4,5,6,7,8,9].map(i=>`/assets/ghost/eyes/${i}.svg`);const itemPaths=man?.items?.map(e=>"/"+e.file)||[0,1,2,3,4].map(i=>`/assets/ghost/items/${i}.svg`);const hatPaths=man?.hats?.map(e=>"/"+e.file)||[0,1,2,3,4].map(i=>`/assets/ghost/hats/${i}.svg`);
 bgImgs=loadImgs(["forest","heaven","sea","dunes","mountain","beach"].map(n=>`/assets/environments/${n}_bg.jpg`));bgFar=loadImgs(["forest","heaven","sea","dunes","mountain","beach"].map(n=>`/assets/environments/${n}_far.jpg`));bgFg=loadImgs(["forest","heaven","sea","dunes","mountain","beach"].map(n=>`/assets/environments/${n}_fg2.png`));bgNear=loadImgs(["forest","heaven","sea","dunes","mountain","beach"].map(n=>`/assets/environments/${n}_fgapi.png`));eyeImgs=loadImgs(eyePaths);

itemImgs=loadImgs(itemPaths);hatImgs=loadImgs(hatPaths);orbImgs=loadImgs([0,1,2,3,4].map(i=>`/assets/ui/orb${i}.png`));window._manifest=man;
 const fill=(sel,arr)=>sel.replaceChildren(...arr.map((v,i)=>new Option(v,i)));["#fBeat0","#fBeat1","#fBeat2"].forEach((s2,i)=>{fill($(s2),MIMES);$(s2).value=i});
 const cards=(el,items,render,get,set,names)=>{el.replaceChildren(...items.map((it,i)=>{const b=document.createElement("button");b.className="card"+(get()===i?" sel":"");b.title=names?names[i]:(typeof it==="string"?it:"");b.innerHTML=render(it,i);b.onclick=()=>{set(i);cards(el,items,render,get,set);if(heroWisp)heroWisp.soul=currentSoul()};return b}))};
 cards($("#eyeCards"),EYE_NAMES,(v,i)=>`<span class="eyePrev"><img src="/assets/ghost/eyes/${i}.svg"></span>`,()=>CUST.eyes,v=>CUST.eyes=v,EYE_NAMES);
 cards($("#hatCards"),HATS,(v,i)=>i?`<img src="/assets/ghost/hats/${i-1}.png" style="width:52px;height:52px;object-fit:contain">`:`<span style="font-size:1.3rem">—</span>`,()=>CUST.hat,v=>CUST.hat=v,HATS.map((_,i)=>i?"Hat "+i:"None"));
 cards($("#itemCards"),ITEMS,(v,i)=>i?`<img src="/assets/ghost/items/${i-1}.png" style="width:52px;height:52px;object-fit:contain">`:`<span style="font-size:1.3rem">—</span>`,()=>CUST.item,v=>CUST.item=v,["None","Blossom","Star wand","Mushroom","Crystal ball","Candle"]);
 cards($("#gestureCards"),ARM_GESTURES,v=>`<span>${v}</span>`,()=>CUST.gesture,v=>CUST.gesture=v);
 const swatches=(el,pick)=>{const cols=["#f8fafc","#fda4af","#93c5fd","#86efac","#fde68a","#1f2937","#fb923c","#c084fc"];el.replaceChildren(...cols.map(c=>{const b=document.createElement("button");b.className="sw";b.style.background=c;b.onclick=()=>pick(c);return b}))};
 swatches($("#bodySwatches"),c=>{$("#bodyColor").value=c;CUST.bodyColor=c;if(heroWisp)heroWisp.soul=currentSoul()});
 $("#bodyColor").addEventListener("input",e=>{CUST.bodyColor=e.target.value;if(heroWisp)heroWisp.soul=currentSoul()});
    if(new URLSearchParams(location.search).has("limbo"))openLimbo();window._env=0;makeParticles();requestAnimationFrame(frame);await load()})();

