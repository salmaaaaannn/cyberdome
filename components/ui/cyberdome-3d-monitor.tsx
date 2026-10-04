// @ts-nocheck
'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface Cyberdome3DMonitorProps {
  className?: string;
  style?: React.CSSProperties;
}

function initMachineScene(container, fontFamily) {

  const P = (deg) => deg * (Math.PI / 180);
  const w = (val, min, max) => Math.max(min, Math.min(max, val));
  const A = (start, end, alpha) => (1 - alpha) * start + alpha * end;

  const eF = THREE.Scene;
  const ng = THREE.PerspectiveCamera;
  const a9 = THREE.WebGLRenderer;
  const l = THREE.SRGBColorSpace;
  const so = OrbitControls;
  const n6 = THREE.PMREMGenerator;
  const sE = RoomEnvironment;
  const nr = THREE.HemisphereLight;
  const ny = THREE.DirectionalLight;
  const nv = THREE.PointLight;
  const i$ = THREE.MeshStandardMaterial;
  const sS = RoundedBoxGeometry;
  const iM = THREE.BoxGeometry;
  const iy = THREE.CylinderGeometry;
  const iH = THREE.SphereGeometry;
  const iP = THREE.CatmullRomCurve3;
  const I = THREE.Vector3;
  const iW = THREE.TubeGeometry;
  const tW = THREE.Mesh;
  const ig = THREE.CanvasTexture;
  const iV = THREE.PlaneGeometry;
  const tD = THREE.MeshBasicMaterial;
  const eR = THREE.Group;
  const iX = THREE.ShadowMaterial;
  const ie = THREE.LineBasicMaterial;
  const ip = THREE.LineSegments;
  const ty = THREE.BufferGeometry;
  const t5 = THREE.Plane;
  const iG = THREE.TorusGeometry;
  const t1 = THREE.InstancedMesh;
  const eA = THREE.Object3D;
  const ik = THREE.RingGeometry;
  const nD = THREE.Raycaster;
  const L = THREE.Vector2;
  const K = THREE.Texture;

          let i=[
            
          ],n=(e,t,n)=>{
            e.addEventListener(t,n),i.push(()=>e.removeEventListener(t,n))
          };
          function r(t){
            let i=e.querySelector(`#${t}`);
            if(!i)throw Error(`Scene markup is missing #${t}`);
            return i
          }function a(e){
            r("loading").classList.add("done"),r("error").style.display="block",e&&(r("error").querySelector("p").textContent=e)
          }try{
            let F,B,z=2*Math.PI,V=document.documentElement.classList.contains("embed"),k=matchMedia("(prefers-reduced-motion: reduce)").matches,H=new eF,G=new ng(33,innerWidth/innerHeight,.1,150);
            try{
              F=new a9({
                antialias:!0,alpha:!0,powerPreference:"high-performance"
              })
            }catch(e){
              throw a("WebGL is not available. Turn on hardware acceleration in your browser settings and reload the page."),e
            }F.setClearColor(0,0),F.setPixelRatio(Math.min(devicePixelRatio,innerWidth<900?1.5:1.75)),F.setSize(innerWidth,innerHeight),F.outputColorSpace=l,F.toneMapping=4,F.toneMappingExposure=1.12,F.shadowMap.enabled=!0,F.shadowMap.type=1,F.localClippingEnabled=!0,r("scene").appendChild(F.domElement);
            let W=new so(G,F.domElement);
            W.enableDamping=!0,W.dampingFactor=.065,W.enablePan=!1,W.minDistance=7,W.maxDistance=55,W.minPolarAngle=.09,W.maxPolarAngle=.475*Math.PI,W.rotateSpeed=.48,W.zoomSpeed=.7,V&&(W.enableZoom=!1,matchMedia("(pointer:coarse)").matches&&(W.enableRotate=!1));
            let X=new n6(F),j=new sE,Y=X.fromScene(j,.04);
            H.environment=Y.texture,H.environmentIntensity=.62,j.dispose(),X.dispose(),H.add(new nr(0x8AA6D6, 0x0C1118, 1.8));
            let q = new ny(0xE4B894, 3.8);
            q.position.set(-4,12,7),q.castShadow=!0,q.shadow.mapSize.set(2048,2048),Object.assign(q.shadow.camera,{
              left:-10,right:10,top:9,bottom:-9,near:.5,far:35
            }),q.shadow.normalBias=.035,q.shadow.bias=-2e-4,q.shadow.radius=4,H.add(q);
            let Z = new ny(0x8AA6D6, 2.8);
            Z.position.set(3,7,-8),H.add(Z);
            let J = new nv(0xE4B894, 20, 28, 2);
            J.position.set(-4,5,3),H.add(J);
            let $ = new ny(0x8AA6D6, 0.8);
            $.position.set(5,3,10),H.add($);
            let Q = (color, metalness = 0.1, roughness = 0.4, extra = {}) =>
  new i$({ color, metalness, roughness, ...extra });
let M = {
  // Material Dictionary (Quiet Security)

  body: Q(0x151B26, 0.82, 0.25),
  base: Q(0x111620, 0.88, 0.28),
  edge: Q(0x2A3447, 0.85, 0.22),
  chrome: Q(0x9BAEC8, 0.94, 0.16),
  dark: Q(0x0E141D, 0.55, 0.35),
  rubber: Q(0x161C26, 0.1, 0.65),
  amber: Q(0xE4B894, 0.45, 0.28),
  ivory: Q(0xD4DCE8, 0.52, 0.26),
  copper: Q(0xE4B894, 0.78, 0.32),
  black: Q(0x0A0E15, 0, 0.6),
  light: Q(0x8AA6D6, 0.2, 0.25, {
    emissive: 0x8AA6D6,
    emissiveIntensity: 1.6
  }),
  whiteLight: Q(0xEAEEF5, 0.1, 0.3, {
    emissive: 0xD0DCF0,
    emissiveIntensity: 1.5
  }),
  green: Q(0xA8D5BA, 0.1, 0.3, {
    emissive: 0xA8D5BA,
    emissiveIntensity: 0.75
  }),
  glass: Q(0x8AA6D6, 0.45, 0.16, {
    transparent: true,
    opacity: 0.18,
    depthWrite: false
  }),
  paper: Q(0xE2E8F0, 0, 0.85)
},et=new Map;
            function s(e,t,i,n=.04){
              let r=`b${e},${t},${i},${n}`;
              return et.has(r)||et.set(r,n?new sS(e,t,i,2,Math.min(n,e/3,t/3,i/3)):new iM(e,t,i)),et.get(r)
            }function o(e,t,i,n,r,a,l,h=M.body,c=.04){
              let u=new tW(s(t,i,n,c),h);
              return u.position.set(r,a,l),u.castShadow=!0,u.receiveShadow=!0,e.add(u),u
            }function h(e,t,i,n,r,a,s=M.chrome,o=t,l=24){
              let c=`c${t},${o},${i},${l}`;
              et.has(c)||et.set(c,new iy(t,o,i,l));
              let u=new tW(et.get(c),s);
              return u.position.set(n,r,a),u.castShadow=!0,u.receiveShadow=!0,e.add(u),u
            }function c(e,t,i,n,r,a=M.chrome){
              let s=`s${t}`;
              et.has(s)||et.set(s,new iH(t,12,8));
              let o=new tW(et.get(s),a);
              return o.position.set(i,n,r),e.add(o),o
            }function u(e,t,i,n=M.chrome){
              let r=new iP(t.map(e=>new I(...e))),a=new tW(new iW(r,Math.max(12,7*t.length),i,8,!1),n);
              return a.castShadow=!0,e.add(a),a
            }function d(e,t,i,n){
              h(e,.055,.026,t,i,n,M.chrome,void 0,12),o(e,.068,.005,.009,t,i+.014,n,M.dark,0)
            }function p(e,t,i){
              let n=document.createElement("canvas");
              n.width=e,n.height=t;
              let r=n.getContext("2d");
              i(r,e,t);
              let a=new ig(n);
              return a.colorSpace=l,a.anisotropy=Math.min(4,F.capabilities.getMaxAnisotropy()),{
                texture:a,canvas:n,ctx:r
              }
            }function f(e,i,n,r,a=20,s="#f4f1ea",o=500){
              e.fillStyle=s,e.font=`${o} ${a}px ${t}`,e.fillText(i,n,r)
            }function m(e,t,i,n,r,a,s){
              let o="texture"in s?s.texture:s,l=new tW(new iV(t,i),new tD({
                map:o,toneMapped:!1
              }));
              return l.position.set(n,r,a),e.add(l),l
            }let ei=new eR;
            H.add(ei);
            let en=new tW(new iV(70,70),new iX({
              opacity:.23
            }));
            en.rotation.x=-Math.PI/2,en.position.y=-.43,en.receiveShadow=!0,H.add(en);
            let er=p(128,128,(e,t,i)=>{
              let n=e.createRadialGradient(64,64,12,64,64,64);
              n.addColorStop(0,"rgba(0,0,0,.8)"),n.addColorStop(.55,"rgba(0,0,0,.45)"),n.addColorStop(1,"rgba(0,0,0,0)"),e.fillStyle=n,e.fillRect(0,0,t,i)
            }),ea=new tW(new iV(18,13),new tD({
              map:er.texture,transparent:!0,depthWrite:!1,opacity:.65
            }));
            for(let e of(ea.rotation.x=-Math.PI/2,ea.position.y=-.415,H.add(ea),o(ei,12.8,.38,8.25,0,-.09,0,M.base,.17),o(ei,12.6,.055,8.08,0,.13,0,M.edge,.11),o(ei,12.49,.09,7.96,0,.19,0,M.body,.1),o(ei,12.55,.027,8.02,0,-.19,0,M.dark,.06),o(ei,11.9,.026,.032,0,-.17,4.115,M.light,.01),[
              -5.6,5.6
            ]))for(let t of[
              -3.35,3.35
            ])h(ei,.39,.25,e,-.31,t,M.rubber),h(ei,.29,.09,e,-.4,t,M.dark),d(ei,e,.253,t);
            for(let e of[
              -6.02,6.02
            ])for(let t of[
              -3.73,3.73
            ])d(ei,e,.255,t);
            let es = p(1536, 176, (e, t, i) => {
  e.fillStyle = "#151B26";
  e.fillRect(0, 0, t, i);
  e.strokeStyle = "rgba(138, 166, 214, 0.25)";
  e.lineWidth = 2;
  e.strokeRect(2, 2, t - 4, i - 4);
  f(e, "DEFENSE GRID", 45, 79, 40, "#EAEEF5", 650);
  f(e, "·  telemetry  ·  ml detection  ·  automated soar", 430, 79, 32, "#8AA6D6", 450);
  f(e, "CYBERDOME ACTIVE THREAT MONITORING    /    QUIET SECURITY", 47, 133, 19, "#6B7A94", 500);
  f(e, "GRID 001", 1360, 130, 23, "#E4B894");
});
            m(ei,7.35,.84,-.4,.25,3.51,es).rotation.x=-Math.PI/2;
            for(let e=0;
            e<16;
            e++)o(ei,.015,.009,.11+e%4*.035,-5.6+.09*e,.249,3.5,M.edge,0);
            let eo=new eR;
            H.add(eo);
            let el=new ie({
              color:6910330,transparent:!0,opacity:.12
            }),eh=[
              
            ];
            for(let e of[
              7.5,8.1
            ])for(let t=0;
            t<120;
            t++)for(let i of[
              t,t+1
            ]){
              let t=i/120*z;
              eh.push(new I(Math.cos(t)*e,-.4,Math.sin(t)*e*.72))
            }for(let e=0;
            e<52;
            e++){
              let t=e/52*z;
              eh.push(new I(8.1*Math.cos(t),-.395,8.1*Math.sin(t)*.72),new I(Math.cos(t)*(8.1+(e%4==0?.16:.07)),-.395,Math.sin(t)*(8.1+(e%4==0?.16:.07))*.72))
            }eo.add(new ip(new ty().setFromPoints(eh),el));
            let ec=[
              
            ],eu=new t5(new I(0,-1,0),10),ed=[
              
            ];
            function g(e){
              let t=e.clone();
              return t.clippingPlanes=[
                eu
              ],t.clipShadows=!0,t.side=2,ed.push(t),t
            }let ep={
              body:g(M.body),ivory:g(M.ivory),amber:g(M.amber),edge:g(M.edge)
            },ef=[
              
            ];
            function _(e,t,i,n,r=.3,a=!1){
              let s=new eR;
              s.position.set(t,i,n),a&&(s.rotation.x=Math.PI/2),e.add(s),h(s,r,.09,0,0,0,M.copper),h(s,.66*r,.105,0,0,0,M.dark),h(s,.22*r,.14,0,0,0,M.chrome);
              for(let e=0;
              e<12;
              e++){
                let t=e/12*z;
                o(s,.26*r,.085,.2*r,Math.cos(t)*r,0,Math.sin(t)*r,M.copper,.008).rotation.y=-t
              }return s.userData.moving=!0,ef.push({
                g:s,vertical:a
              }),s
            }[
  {
    id: "engine",
    name: "ML Fusion",
    step: 2,
    output: "Telemetry",
    pos: [-4.15, 0.29, -0.65],
    desc: "Multi-model detection fusion: Network, IoT, UEBA and URL neural vectors."
  },
  {
    id: "admin",
    name: "AI Copilot",
    step: 3,
    output: "Analysis",
    pos: [-1.65, 0.29, -2.03],
    desc: "Grounded SOC copilot, LLM incident explanation, and posture defense."
  },
  {
    id: "storefront",
    name: "Command Center",
    step: 4,
    output: "Incident",
    pos: [1.5, 0.29, -2.08],
    desc: "Security event correlation, live digital twin, and defense operations."
  },
  {
    id: "cabinet",
    name: "Sensor Ingress",
    step: 1,
    output: "Packet",
    pos: [4.03, 0.29, 0.12],
    desc: "Real-time network anomaly ingestion, IoT telemetry, and browser security events."
  },
  {
    id: "cashdesk",
    name: "SOAR Engine",
    step: 5,
    output: "Response",
    pos: [0.93, 0.29, 1.85],
    desc: "Autonomous playbook orchestration, human-in-the-loop approvals, and rapid containment."
  }
].forEach((e,t)=>{
              let n=new eR;
              n.position.fromArray(e.pos),ei.add(n);
              let a=M.light.clone();
              for(let e of(a.emissiveIntensity=.5,o(n,2.05,.12,1.78,0,.03,0,M.dark,.1),o(n,1.97,.03,1.7,0,.12,0,a,.09),o(n,2.03,.17,1.75,0,.215,0,M.body,.1),[
                -.85,.85
              ]))for(let t of[
                -.7,.7
              ])d(n,e,.311,t);
              _(n,-.35,.45,0,.27),_(n,.22,.45,.12,.21),o(n,.6,.15,.36,.52,.47,-.33,M.dark);
              for(let e=0;
              e<6;
              e++)o(n,.025,.16,.37,.3+.08*e,.47,-.33,M.edge,.004);
              u(n,[
                [
                  -.7,.4,-.4
                ],[
                  -.55,.48,.4
                ],[
                  .35,.45,.6
                ],[
                  .7,.58,.23
                ]
              ],.023,M.light);
              let s = p(512, 116, (i, n, r) => {
  i.fillStyle = "#151B26";
  i.fillRect(0, 0, n, r);
  f(i, String(t + 1).padStart(2, "0"), 24, 76, 42, "#8AA6D6", 550);
  f(i, e.name.toUpperCase(), 111, 73, 35, "#EAEEF5", 550);
});
              m(n,1.54,.345,0,.27,.891,s);
              let l=document.createElement("div");
              l.className="station-label",l.innerHTML=`<div class="stem"></div><div class="label-card"><div class="label-title"><span>${String(t+1).padStart(2,"0")}</span>${e.name}</div><div class="label-meta">Step ${e.step} \xb7 ${e.output}</div></div>`,r("labels").appendChild(l),i.push(()=>l.remove()),ec.push({
                ...e,group:n,base:new I(...e.pos),glowMat:a,label:l,index:t,anchor:new I(0,2.5,0)
              })
            });
            let em=ec[
              0
            ].group;
            for(let e of(o(em,1.74,.62,1.33,0,.65,-.05,ep.ivory,.13),o(em,1.5,.1,1.16,0,.99,-.04,ep.body,.025),[
              -.68,.68
            ]))h(em,.065,1.73,e,1.35,-.18,M.chrome),o(em,.22,1.8,.22,e,1.37,-.44,ep.ivory,.035);
            o(em,1.82,.27,.4,0,2.28,-.35,ep.amber,.045),o(em,1.55,.06,.06,0,2.13,-.115,M.chrome,.01);
            let eg=new eR;
            em.add(eg),eg.position.set(0,1.9,-.08),eg.userData.moving=!0,o(eg,.45,.36,.44,0,0,0,M.body,.05),h(eg,.11,.13,0,-.24,.03,M.chrome,.04),o(eg,.24,.045,.022,0,.09,.23,M.light,.01),u(em,[
              [
                -.68,2.1,-.35
              ],[
                -.42,2.52,-.4
              ],[
                .25,2.5,-.4
              ],[
                .35,2.01,-.12
              ]
            ],.032,M.dark);
            let e_=[
              
            ];
            for(let[
              e,t
            ]of[
              [
                -1.03,1.82
              ],[
                -.94,2.78
              ]
            ]){
              let i=new eR;
              for(let n of(i.position.set(e,t,-.48),em.add(i),i.userData.moving=!0,h(i,.4,.22,0,0,0,M.dark).rotation.x=Math.PI/2,[
                -.14,.14
              ])){
                h(i,.46,.045,0,0,n,M.chrome).rotation.x=Math.PI/2;
                for(let e=0;
                e<6;
                e++){
                  let t=e/6*z;
                  h(i,.1,.006,.29*Math.cos(t),.29*Math.sin(t),n+(n>0?.026:-.026),M.dark,void 0,14).rotation.x=Math.PI/2
                }
              }h(i,.095,.37,0,0,0,M.amber).rotation.x=Math.PI/2,e_.push(i)
            }u(em,[
              [
                -1.36,2.66,-.48
              ],[
                -1.5,2.34,-.48
              ],[
                -1.34,1.92,-.48
              ]
            ],.045,M.dark);
            let ev=p(384,640,()=>{
              
            });
            function v(e) {
  let t = ev.ctx;
  t.fillStyle = "#151B26";
  t.fillRect(0, 0, 384, 640);
  t.fillStyle = "#1C2433";
  t.beginPath();
  t.arc(330, 205, 210, 0, z);
  t.fill();
  t.strokeStyle = "#8AA6D6";
  t.lineWidth = 13;
  for (let i = 0; i < 3; i++) {
    t.beginPath();
    t.ellipse(194, 270, 90 - 21 * i, 111, 0.3 * Math.sin(0.25 * e) + 0.4, 0, z);
    t.stroke();
  }
  f(t, "CYBER", 28, 57, 24, "#EAEEF5", 650);
  f(t, "DOME.", 24, 103, 42, "#8AA6D6", 700);
  t.fillStyle = "#0E141D";
  t.beginPath();
  t.roundRect(25, 465, 334, 123, 12);
  t.fill();
  let i = [
    "Threat detected —",
    "Analyzing telemetry.",
    "Autonomous shield",
    "Defending perimeter."
  ];
  let n = Math.floor(0.7 * e) % 4;
  f(t, i[n], 45, 505, 25, "#EAEEF5", 550);
  f(t, i[(n + 1) % 4], 45, 547, 25, "#9BAEC8", 550);
  t.fillStyle = "#8AA6D6";
  t.fillRect(27, 615, Math.max(10, (0.13 * e) % 1 * 330), 5);
  ev.texture.needsUpdate = true;
}v(0);
            let ex=new eR;
            for(let e of(ex.userData.moving=!0,em.add(ex),o(ex,.62,1.08,.055,0,1.36,.61,M.dark,.035),m(ex,.56,.98,0,1.36,.641,ev),o(em,1.14,.12,.2,0,.83,.66,M.dark,.025),[
              -.42,.42
            ]))h(em,.115,.18,e,.92,.6,M.chrome).rotation.z=Math.PI/2;
            for(let e=0;
            e<5;
            e++)o(em,.08,.03,.22,-.38+.19*e,1.011,-.02,M.edge,.005);
            let eM=ec[
              1
            ].group;
            o(eM,1.9,.66,1.36,0,.67,-.04,ep.body,.11);
            let ey=new eR;
            ey.position.set(0,1.01,-.08),ey.rotation.x=-.32,eM.add(ey),o(ey,1.76,.12,1.27,0,0,0,ep.ivory,.04);
            let eS=p(640,340,()=>{
              
            });
            function x(e) {
  let t = eS.ctx;
  t.fillStyle = "#151B26";
  t.fillRect(0, 0, 640, 340);
  f(t, "THREAT PIPELINE", 25, 45, 21, "#EAEEF5", 550);
  f(t, "03 / 08 ACTIVE", 460, 45, 20, "#8AA6D6", 500);
  for (let i = 0; i < 3; i++) {
    let n = 74 + 76 * i;
    t.fillStyle = "#1C2433";
    t.beginPath();
    t.roundRect(21, n, 598, 61, 6);
    t.fill();
    t.fillStyle = 0 === i ? "#8AA6D6" : "#2A3447";
    t.fillRect(34, n + 10, 27, 41);
    f(t, ["Network Anomaly", "UEBA Lateral Move", "Malicious URL Phish"][i], 77, n + 29, 19, "#EAEEF5");
    f(t, 0 === i ? "ANALYZING" : "QUEUED", 77, n + 49, 11, 0 === i ? "#8AA6D6" : "#6B7A94");
    t.fillStyle = "#0E141D";
    t.fillRect(377, n + 26, 214, 7);
    t.fillStyle = 0 === i ? "#8AA6D6" : "#4A5A72";
    t.fillRect(377, n + 26, 0 === i ? (0.15 * e) % 1 * 214 : 41 + 27 * i, 7);
  }
}x(0),m(ey,1.53,.79,0,.067,-.17,eS).rotation.x=-Math.PI/2;
            let eb=[
              
            ];
            for(let e=0;
            e<4;
            e++){
              let t=-.57+.38*e;
              h(ey,.074,.035,t,.1,.45,M.dark);
              let i=h(ey,.025,.15,t,.19,.45,M.chrome);
              i.rotation.x=-.4,i.userData.moving=!0,eb.push(i),c(ey,.04,t,.275,.421,M.ivory)
            }h(eM,.075,.06,.77,1.05,-.62,M.green);
            for(let e=0;
            e<7;
            e++)o(eM,.55,.027,.02,0,.46+.05*e,.655,M.dark,.003);
            let eE=ec[
              2
            ].group;
            o(eE,1.35,.18,.88,0,.44,0,ep.ivory,.045),h(eE,.095,1.04,0,.93,-.31,M.chrome),o(eE,.56,.91,.14,0,.99,-.34,ep.body,.04),o(eE,2.42,1.72,.2,0,1.94,-.17,ep.ivory,.08),o(eE,2.28,1.59,.1,0,1.94,-.044,M.dark,.045);
            let eT = p(896, 592, (e, t, i) => {
  e.fillStyle = "#151B26";
  e.fillRect(0, 0, t, i);
  e.fillStyle = "#1C2433";
  e.fillRect(0, 0, t, 56);
  e.fillStyle = "#6B7A94";
  for (let t = 0; t < 3; t++) {
    e.beginPath();
    e.arc(26 + 19 * t, 27, 4, 0, z);
    e.fill();
  }
  f(e, "CYBERDOME SOC", 33, 100, 22, "#EAEEF5", 650);
  f(e, "Overview    Incidents    SOAR", 535, 98, 14, "#8AA6D6");
  e.fillStyle = "#1C2433";
  e.beginPath();
  e.roundRect(32, 131, 287, 401, 10);
  e.fill();
  e.strokeStyle = "#2A3447";
  e.lineWidth = 8;
  for (let t = 0; t < 3; t++) {
    e.beginPath();
    e.ellipse(175, 320, 75 - 17 * t, 94, 0.4, 0, z);
    e.stroke();
  }
  f(e, "AUTONOMOUS", 52, 181, 29, "#EAEEF5", 700);
  f(e, "DEFENSE.", 52, 220, 29, "#8AA6D6", 700);
  f(e, "Zero-day threat.", 359, 197, 41, "#EAEEF5", 600);
  f(e, "Mitigated live.", 359, 252, 41, "#A8D5BA", 600);
  f(e, "AI Copilot grounded context.", 362, 300, 19, "#9BAEC8");
  f(e, "Safe autonomous SOAR response.", 362, 329, 19, "#9BAEC8");
  for (let t = 0; t < 3; t++) {
    e.fillStyle = "#2A3447";
    e.fillRect(362, 363 + 16 * t, 400 - 43 * t, 5);
  }
  e.fillStyle = "#2A3447";
  e.beginPath();
  e.roundRect(359, 447, 279, 62, 7);
  e.fill();
  f(e, "Deploy SOAR Playbook  ↗", 390, 486, 22, "#EAEEF5", 500);
  f(e, "PROTECTED BY CYBERDOME AGENTS", 33, 571, 12, "#6B7A94");
});
            m(eE,2.16,1.43,0,1.95,.011,eT),c(eE,.024,0,2.747,-.05,M.dark),o(eE,.21,.019,.008,0,1.149,.013,M.light,.003),m(eE,.685,.96,-.655,1.86,.018,ev);
            let ew=new eR;
            ew.userData.moving=!0,eE.add(ew),o(ew,.59,.77,.045,.94,.81,.55,M.ivory,.025);
            let eC = p(220, 290, (e, t, i) => {
  e.fillStyle = "#151B26";
  e.fillRect(0, 0, t, i);
  e.fillStyle = "#1C2433";
  e.fillRect(15, 16, 190, 168);
  e.fillStyle = "#8AA6D6";
  e.beginPath();
  e.moveTo(94, 66);
  e.lineTo(140, 100);
  e.lineTo(94, 134);
  e.fill();
  f(e, "TELEMETRY", 17, 225, 23, "#EAEEF5", 600);
  e.fillStyle = "#2A3447";
  e.fillRect(17, 244, 153, 6);
  e.fillRect(17, 258, 104, 5);
});
            m(ew,.55,.72,.94,.81,.575,eC);
            let eP=ec[
              3
            ].group;
            o(eP,1.75,1.77,1.02,0,1.24,-.13,ep.body,.12),o(eP,1.58,.13,1.09,0,2.16,-.13,ep.amber,.04),o(eP,1.47,1.38,.055,0,1.31,.405,M.dark,.025);
            let eL = p(480, 460, (e, t, i) => {
  e.fillStyle = "#151B26";
  e.fillRect(0, 0, t, i);
  f(e, "ACTIVE INCIDENTS", 30, 51, 27, "#EAEEF5", 550);
  f(e, "Today · 3 open", 30, 81, 16, "#8AA6D6");
  ["Phishing Drill", "SSH Brute Force", "Data Exfiltration"].forEach((t, i) => {
    let n = 110 + 100 * i;
    e.fillStyle = "#1C2433";
    e.beginPath();
    e.roundRect(22, n, 436, 83, 8);
    e.fill();
    e.fillStyle = ["#E4B894", "#8AA6D6", "#A8D5BA"][i];
    e.beginPath();
    e.arc(58, n + 40, 19, 0, z);
    e.fill();
    f(e, t[0], 49, n + 47, 20, "#0C1118", 600);
    f(e, t, 93, n + 33, 23, "#EAEEF5", 550);
    f(e, ["Triage", "Investigating", "Contained"][i], 93, n + 58, 15, "#9BAEC8");
    f(e, "↗", 410, n + 49, 25, "#8AA6D6");
  });
});
            m(eP,1.31,1.255,0,1.37,.44,eL),o(eP,1.27,.075,.29,0,.57,.55,M.chrome,.02);
            for(let e=0;
            e<3;
            e++)o(eP,1.15,.021,.12,0,.58+.15*e,-.35,M.copper,.006);
            u(eP,[
              [
                .69,.43,-.2
              ],[
                .89,.65,-.2
              ],[
                .89,1.8,-.2
              ],[
                .65,1.99,-.2
              ]
            ],.033,M.chrome);
            let eD=new eR;
            eD.userData.moving=!0,eP.add(eD),o(eD,.86,.42,.043,0,0,0,M.light,.035);
            let eI = p(432, 204, (e, t, i) => {
  e.fillStyle = "#1C2433";
  e.fillRect(0, 0, t, i);
  e.fillStyle = "#2A3447";
  e.beginPath();
  e.arc(58, 98, 32, 0, z);
  e.fill();
  f(e, "P", 42, 112, 34, "#E4B894", 550);
  f(e, "Phish Drill", 108, 91, 38, "#EAEEF5", 600);
  f(e, "Triage  +", 108, 138, 23, "#8AA6D6", 500);
});
            m(eD,.82,.39,0,0,.026,eI);
            let eN=ec[
              4
            ].group;
            o(eN,1.91,.63,1.32,0,.65,-.06,ep.ivory,.12),o(eN,1.96,.19,1.38,0,.42,-.04,ep.body,.04),o(eN,1.37,.09,.038,0,.44,.66,M.dark,.01),o(eN,.37,.042,.03,0,.45,.687,M.chrome,.009),o(eN,1.02,.25,.91,-.33,1.04,-.03,ep.body,.045);
            for(let e=0;
            e<3;
            e++)for(let t=0;
            t<3;
            t++)o(eN,.19,.085,.17,-.62+.27*t,1.21,.27-.24*e,2===t&&2===e?M.amber:M.ivory,.022);
            o(eN,.64,.6,.52,.58,1.04,-.15,ep.body,.045),o(eN,.48,.07,.09,.59,1.37,-.1,M.dark,.01),h(eN,.06,.65,-.35,1.6,-.56,M.chrome),o(eN,1.13,.46,.19,-.35,1.98,-.56,ep.body,.045);
            let eU=p(512,176,()=>{
              
            });
            (B = eU.ctx).fillStyle = "#151B26";
B.fillRect(0, 0, 512, 176);
f(B, "INCIDENT CONTAINED", 22, 44, 23, "#8AA6D6", 500);
f(B, "+ 100% SAFE", 26, 131, 66, "#A8D5BA", 500);
m(eN,1.015,.349,-.35,1.98,-.459,eU);
            let eO=new eR;
            eO.position.set(.59,1.37,-.1),eO.userData.moving=!0,eN.add(eO);
            let eB = p(280, 540, (e, t, i) => {
  e.fillStyle = "#151B26";
  e.fillRect(0, 0, t, i);
  f(e, "CYBERDOME SOC", 25, 52, 24, "#EAEEF5", 650);
  f(e, "SOAR EXECUTION AUDIT", 32, 87, 19, "#6B7A94");
  e.strokeStyle = "rgba(138, 166, 214, 0.3)";
  e.setLineDash([5, 6]);
  e.beginPath();
  e.moveTo(22, 115);
  e.lineTo(258, 115);
  e.stroke();
  f(e, "Action: Quarantine", 25, 154, 20, "#EAEEF5");
  f(e, "Host: node-09", 25, 190, 20, "#9BAEC8");
  f(e, "CONTAINED", 25, 263, 31, "#A8D5BA", 650);
  f(e, "Auto Mitigated", 25, 317, 24, "#8AA6D6");
  for (let t = 0; t < 44; t++) {
    e.fillStyle = "#2A3447";
    e.fillRect(25 + 5 * t, 370, 1 + (t % 3), 83);
  }
  f(e, "AUDIT-0001", 81, 496, 17, "#6B7A94");
});
            m(eO,.41,.83,0,.415,.01,eB).material.side=2,eO.rotation.x=-.16;
            let ez=new eR;
            ez.userData.moving=!0,eN.add(ez),h(ez,.22,.065,0,0,0,M.amber,void 0,32).rotation.x=Math.PI/2;
            let eV=new tW(new iG(.174,.014,6,32),M.light);
            eV.position.z=.037,ez.add(eV);
            let ek=p(128,128,(e,t,i)=>{
              e.clearRect(0,0,t,i),e.textAlign="center",f(e,"$",64,95,91,"#80561c",650)
            });
            m(ez,.28,.28,0,0,.04,ek).material.transparent=!0,h(eN,.33,.09,1.04,.39,.55,M.dark),h(eN,.26,.025,1.04,.445,.55,M.copper);
            let eH=new iP([
              [
                -3.95,.84,.65
              ],[
                -3.1,.84,-.12
              ],[
                -1.45,.84,-.79
              ],[
                1.32,.84,-.8
              ],[
                3.3,.84,.19
              ],[
                3.43,.84,1.21
              ],[
                1.35,.84,2.7
              ],[
                -1.4,.84,2.52
              ],[
                -3.54,.84,1.65
              ]
            ].map(e=>new I(...e)),!0,"catmullrom",.25),eG=new eR;
            ei.add(eG);
            let eW=new tW(new iW(eH,150,.35,8,!0),M.dark);
            eW.scale.y=.3,eW.position.y=.51,eG.add(eW);
            let eX=new t1(s(.135,.065,.63,.012),M.body,148);
            eX.receiveShadow=!0,eX.castShadow=!1,eG.add(eX),eX.instanceMatrix.setUsage(35048);
            let ej=new eA,eY=new I,eq=new I;
            function updateTreads(e){
              for(let t=0;
              t<148;
              t++){
                let i=(t/148+.012*e)%1;
                eH.getPointAt(i,eY),eH.getTangentAt(i,eq),ej.position.copy(eY),ej.rotation.set(0,-Math.atan2(eq.z,eq.x),0),ej.updateMatrix(),eX.setMatrixAt(t,ej.matrix)
              }eX.instanceMatrix.needsUpdate=!0
            }for(let e of(updateTreads(0),[
              -1,1
            ])){
              let t=[
                
              ];
              for(let i=0;
              i<=160;
              i++)eH.getPointAt(i/160,eY),eH.getTangentAt(i/160,eq),t.push(eY.clone().add(new I(-(.36*eq.z)*e,.09,.36*eq.x*e)));
              let i=new iP(t);
              eG.add(new tW(new iW(i,160,.028,6,!1),M.chrome))
            }for(let e=0;
            e<16;
            e++){
              let t=eH.getPointAt(e/16);
              h(eG,.045,.43,t.x,.53,t.z,M.chrome)
            }let eK=new eR;
            ei.add(eK);
            let eZ=[
              
            ];
            for(let e=0;
            e<4;
            e++){
              let t=ec[
                e
              ].base,i=ec[
                e+1
              ].base,n=[
                t.clone().add(new I(.4,.12,0)),t.clone().lerp(i,.35).add(new I(0,.1,-.6)),t.clone().lerp(i,.65).add(new I(0,.1,-.6)),i.clone().add(new I(-.4,.12,0))
              ],r=new iP(n),a=new tW(new iW(r,30,.054,8,!1),M.copper);
              eK.add(a),eZ.push({
                mesh:a,a:e,b:e+1
              })
            }let eJ = p(256, 352, (e, t, i) => {
  e.fillStyle = "#151B26";
  e.fillRect(0, 0, t, i);
  f(e, "PAYLOAD", 24, 47, 22, "#EAEEF5", 650);
  f(e, "01 / Ingress", 24, 85, 15, "#8AA6D6");
  for (let t = 0; t < 9; t++) {
    e.fillStyle = 4 === t ? "#8AA6D6" : "#2A3447";
    e.fillRect(24, 111 + 21 * t, 190 - (t % 3) * 24, 6);
  }
  f(e, "ANALYZED  ✓", 24, 327, 17, "#A8D5BA", 600);
});
let e$ = [
  p(256, 352, (e, t, i) => {
    e.fillStyle = "#1C2433";
    e.fillRect(0, 0, t, i);
    f(e, "THREAT", 21, 48, 24, "#EAEEF5", 650);
    f(e, "PACKET", 21, 79, 24, "#8AA6D6", 650);
    e.strokeStyle = "rgba(138, 166, 214, 0.3)";
    e.lineWidth = 2;
    e.strokeRect(23, 112, 210, 139);
    f(e, "SEC-01", 42, 190, 37, "#EAEEF5", 550);
    f(e, "VECTOR / INGRESS", 23, 320, 17, "#9BAEC8");
  }),
  eJ,
  ev,
  eC,
  eB
],eQ=[
              
            ];
            for(let e=0;
            e<6;
            e++){
              let e=new eR;
              e.userData.moving=!0,ei.add(e),o(e,.47,.71,.04,0,0,0,M.ivory,.022);
              let t=e$.map(t=>{
                let i=m(e,.43,.665,0,0,.024,t);
                return i.material.side=2,i.visible=!1,i
              }),i=new tW(new ik(.4,.414,40),new tD({
                color: 0x8AA6D6,transparent:!0,opacity:.8,side:2,depthWrite:!1
              }));
              i.rotation.x=-Math.PI/2,i.position.y=-.37,e.add(i),i.visible=!1,eQ.push({
                group:e,faces:t,halo:i,stage:-1,phase:0
              })
            }let e0=.2,e1=.37,e2=.72;
            function y(e,t){
              let i=0,n=1/0;
              for(let r=0;
              r<300;
              r++){
                let a=eH.getPointAt(r/300),s=(a.x-e)**2+(a.z-t)**2;
                s<n&&(n=s,i=r/300)
              }return i
            }e0=y(-1.65,-.7),e1=y(1.5,-.7),e2=y(.93,2.65),[
              eD,eO,ez,ex,ew,eg,...e_
            ].forEach(e=>e.userData.moving=!0),function e(t){
              for(let i of[
                ...t.children
              ])i.isGroup&&e(i);
              let i=new Map;
              for(let e of t.children){
                if(!e.isMesh||e.isInstancedMesh||e.userData.moving||Array.isArray(e.material))continue;
                let t=e.material.uuid;
                i.has(t)||i.set(t,[
                  
                ]),i.get(t).push(e)
              }for(let e of i.values()){
                if(e.length<2)continue;
                let i=e.map(e=>(e.updateMatrix(),(e.geometry.index?e.geometry.toNonIndexed():e.geometry.clone()).applyMatrix4(e.matrix))),n=function(e,t=!1){
                  let i=null!==e[
                    0
                  ].index,n=new Set(Object.keys(e[
                    0
                  ].attributes)),r=new Set(Object.keys(e[
                    0
                  ].morphAttributes)),a={
                    
                  },s={
                    
                  },o=e[
                    0
                  ].morphTargetsRelative,l=new ty,h=0;
                  for(let c=0;
                  c<e.length;
                  ++c){
                    let u=e[
                      c
                    ],d=0;
                    if(i!==(null!==u.index))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;
                    for(let e in u.attributes){
                      if(!n.has(e))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+'. All geometries must have compatible attributes; make sure "'+e+'" attribute exists among all geometries, or in none of them.'),null;
                      void 0===a[
                        e
                      ]&&(a[
                        e
                      ]=[
                        
                      ]),a[
                        e
                      ].push(u.attributes[
                        e
                      ]),d++
                    }if(d!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". Make sure all geometries have the same number of attributes."),null;
                    if(o!==u.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". .morphTargetsRelative must be consistent throughout all geometries."),null;
                    for(let e in u.morphAttributes){
                      if(!r.has(e))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+".  .morphAttributes must be consistent throughout all geometries."),null;
                      void 0===s[
                        e
                      ]&&(s[
                        e
                      ]=[
                        
                      ]),s[
                        e
                      ].push(u.morphAttributes[
                        e
                      ])
                    }if(t){
                      let e;
                      if(i)e=u.index.count;
                      else{
                        if(void 0===u.attributes.position)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". The geometry must have either an index or a position attribute"),null;
                        e=u.attributes.position.count
                      }l.addGroup(h,e,c),h+=e
                    }
                  }if(i){
                    let t=0,i=[
                      
                    ];
                    for(let n=0;
                    n<e.length;
                    ++n){
                      let r=e[
                        n
                      ].index;
                      for(let e=0;
                      e<r.count;
                      ++e)i.push(r.getX(e)+t);
                      t+=e[
                        n
                      ].attributes.position.count
                    }l.setIndex(i)
                  }for(let e in a){
                    let t=sb(a[
                      e
                    ]);
                    if(!t)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+e+" attribute."),null;
                    l.setAttribute(e,t)
                  }for(let e in s){
                    let t=s[
                      e
                    ][
                      0
                    ].length;
                    if(0!==t){
                      l.morphAttributes=l.morphAttributes||{
                        
                      },l.morphAttributes[
                        e
                      ]=[
                        
                      ];
                      for(let i=0;
                      i<t;
                      ++i){
                        let t=[
                          
                        ];
                        for(let n=0;
                        n<s[
                          e
                        ].length;
                        ++n)t.push(s[
                          e
                        ][
                          n
                        ][
                          i
                        ]);
                        let n=sb(t);
                        if(!n)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+e+" morphAttribute."),null;
                        l.morphAttributes[
                          e
                        ].push(n)
                      }
                    }
                  }return l
                }(i,!1);
                for(let e of i)e.dispose();
                if(!n)continue;
                let r=new tW(n,e[
                  0
                ].material);
                for(let i of(r.castShadow=e.some(e=>e.castShadow),r.receiveShadow=e.some(e=>e.receiveShadow),e))t.remove(i);
                t.add(r)
              }
            }(ei),ec.forEach(e=>e.group.traverse(t=>{
              t.userData.station=e.id
            }));
            let e3=ec.map(e=>e.group),e4="assembled",e5="overview",e6=!k,e8=0,e9=0,e7="engine",te=null,tt=innerWidth,ti=innerHeight,tn=tt<=900,tr=performance.now(),ta=!1,ts=!1,to=0,tl=0,th=!0,tc=0,tu=-1,td=!0,tp=!1,tf=new I,tm=new I(0,1,0),tg=new I(10.5,10.8,17).normalize(),t_=25,tv=!1,tx=!1;
            function S(){
              if(!innerWidth||!innerHeight)return;
              let e=!tv;
              tv=!0,tt=innerWidth,ti=innerHeight,tn=tt<=900,F.setSize(tt,ti),G.aspect=tt/ti,G.setViewOffset(tt,ti,tn||!V?0:-(.21*tt),tn||V?0:.025*ti,tt,ti);
              let t=tt/ti,i=tn?.91:Math.min(.55,t>2?.54:.57),n=17.3/(2*Math.tan(P(G.fov/2))*t*i),r=11.5/(2*Math.tan(P(G.fov/2))*(V?.85:.62));
              t_=Math.max(n,r)*(tn?.97:1)/(V?tn?1.15:1.45:1),W.maxDistance=Math.max(55,1.6*t_),G.updateProjectionMatrix(),b(),th=!0,e&&(G.position.copy(tf),W.target.copy(tm),W.update(),th=!1)
            }function b(){
              let e="stations"===e4?1.2:1;
              if("station"===e5){
                let e=ec.find(e=>e.id===e7);
                tm.copy(e.group.position).add(new I(0,1.25,0)),tf.copy(tm).addScaledVector(tg,tn?9:12)
              }else{
                tm.set(0,1,0);
                let t=t_*e;
                "side"===e5?tf.set(13,5,20).normalize().multiplyScalar(t).add(tm):"top"===e5?tf.set(.01,t,.8).add(tm):tf.copy(tg).multiplyScalar(t).add(tm)
              }
            }function E(){
              e.querySelectorAll("[data-mode]").forEach(e=>e.setAttribute("aria-pressed",String(e.dataset.mode===e4))),e.querySelectorAll("[data-camera]").forEach(e=>e.setAttribute("aria-pressed",String(e.dataset.camera===e5))),r("journey").classList.toggle("visible","order"===e4)
            }let tM = {
  "Global View": "assembled",
  "Internal Logic": "cutaway",
  "Defense Nodes": "stations",
  "Trace Threat": "order",
  Assembled: "assembled",
  Cutaway: "cutaway",
  Stations: "stations",
  "One order": "order",
  assembled: "assembled",
  cutaway: "cutaway",
  stations: "stations",
  order: "order"
};
            function T(e){
              return!!Object.hasOwn(tM,e)&&(e4=tM[
                e
              ],tr=performance.now(),"order"===e4?(e8=0,tu=-1,N(),e5="overview"):"station"===e5&&(e5="overview"),b(),th=!0,E(),!0)
            }function R(e){
              return!!ec.find(t=>t.id===e)&&(e7=e,"order"===e4&&(e4="assembled"),e5="station",tr=performance.now(),b(),th=!0,E(),!0)
            }function C(e){
              return!!Object.hasOwn(tS,e)&&(e5=tS[
                e
              ],"order"===e4&&(e4="assembled"),tr=performance.now(),tc=0,b(),th=!0,E(),!0)
            }function D(){
              let e=r("play");
              e.setAttribute("aria-label",e6?"Pause the animation":"Resume the animation"),e.setAttribute("aria-pressed",String(!e6)),e.innerHTML=e6?'<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="1" width="2.5" height="10" rx=".5"/><rect x="7.5" y="1" width="2.5" height="10" rx=".5"/></svg>':'<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M3 1l8 5-8 5z"/></svg>',r("status").classList.toggle("paused",!e6),r("status-text").textContent = e6 ? "Shield Active" : "Shield Suspended"
            }function N(){
              return e6=!0,D(),!0
            }function U(){
              return e6=!1,D(),!0
            }let tb={
              setMode:T,focusStation:R,setCamera:C,play:N,pause:U
            };
            window.__machine=tb,i.push(()=>{
              window.__machine===tb&&delete window.__machine
            }),e.querySelectorAll("[data-mode]").forEach(e=>n(e,"click",()=>T(e.dataset.mode??""))),e.querySelectorAll("[data-camera]").forEach(e=>n(e,"click",()=>C(e.dataset.camera??""))),n(r("play"),"click",()=>e6?U():N()),D(),S(),G.position.copy(tf),W.target.copy(tm),W.update(),th=!1,n(window,"resize",S),W.addEventListener("start",()=>{
              ta=!0,th=!1,tr=performance.now()
            }),W.addEventListener("end",()=>{
              ta=!1,tr=performance.now()
            }),W.addEventListener("change",()=>{
              ta&&(tr=performance.now())
            });
            let tE=new nD,tT=new L,tw=r("tooltip");
            function O(e,t){
              tT.set(e/tt*2-1,-t/ti*2+1),tE.setFromCamera(tT,G);
              let i=tE.intersectObjects(e3,!0);
              return i.length?ec.find(e=>e.id===i[
                0
              ].object.userData.station):null
            }n(F.domElement,"pointermove",e=>{
              if(Math.hypot(e.clientX-to,e.clientY-tl)>5&&(ts=!0),ta)return;
              let t=O(e.clientX,e.clientY);
              te=t?t.id:null,F.domElement.style.cursor=t?"pointer":"grab",tw.classList.toggle("visible",!!t),t&&(tw.querySelector("strong").innerHTML=`<span>${String(t.index+1).padStart(2,"0")}</span>${t.name}`,tw.querySelector("p").textContent=t.desc,tw.style.left=Math.min(tt-255,Math.max(10,e.clientX+16))+"px",tw.style.top=Math.max(10,Math.min(ti-95,e.clientY-65))+"px")
            }),n(F.domElement,"pointerleave",()=>{
              te=null,tw.classList.remove("visible")
            }),n(F.domElement,"pointerdown",e=>{
              to=e.clientX,tl=e.clientY,ts=!1,tw.classList.remove("visible")
            }),n(F.domElement,"pointerup",e=>{
              if(ts)return;
              let t=O(e.clientX,e.clientY);
              t&&(R(t.id),window.parent.postMessage({
                type:"machine",event:"station",id:t.id
              },"*"))
            }),n(window,"message",e=>{
              if(e.source!==window.parent||!e.data||"machine-control"!==e.data.type)return;
              let{
                action:t,value:i
              }=e.data;
              Object.hasOwn(tb,t)&&tb[
                t
              ](i)
            }),n(document,"visibilitychange",()=>{
              td=!document.hidden,tI=performance.now()
            });
            let tA=new IntersectionObserver(e=>{
              td=e[
                0
              ].isIntersecting&&!document.hidden,tI=performance.now()
            },{
              threshold:.01
            });
            tA.observe(F.domElement),i.push(()=>tA.disconnect()),n(F.domElement,"webglcontextlost",e=>{
              e.preventDefault(),tp=!0,a("The graphics context was interrupted. The scene comes back on its own once WebGL is available again.")
            }),n(F.domElement,"webglcontextrestored",()=>{
              tp=!1,r("error").style.display="none",tI=performance.now()
            });
            let tR = new I, tC = new I, tP = [
  ["Threat Ingress", "Sensor Ingress · packet detected at perimeter"],
  ["Feature Extraction", "ML Fusion · multi-model neural vector scoring"],
  ["Incident Analysis", "AI Copilot · grounded reasoning & posturing"],
  ["Operations Triage", "Command Center · digital twin incident graph"],
  ["Autonomous Containment", "SOAR Engine · automated playbook executed"]
],tL=-1,tI=performance.now(),tN=0,tU=0,tO=F.getPixelRatio(),tF=0;
            tF=requestAnimationFrame(function e(t){
              tF=requestAnimationFrame(e);
              let i=Math.max(0,Math.min((t-tI)/1e3,.045));
              if(tI=t,!td||tp)return;
              e6&&(e8+=i,tc+=i);
              let n=e8,a=n/4%1,s=n*z/4,o=1-Math.exp(-(5*i));
              e9=A(e9,+("stations"===e4),o),eu.constant=A(eu.constant,"cutaway"===e4?.99:10,o),ec.forEach((e,t)=>{
                e.group.position.copy(e.base),e.group.position.x*=1+.29*e9,e.group.position.z*=1+.37*e9,e.group.position.y+=e9*(t%2?.32:.55);
                let i=Math.pow(Math.max(0,Math.sin(s-.9*t)),7);
                e.glowMat.emissiveIntensity=A(e.glowMat.emissiveIntensity,te===e.id||"station"===e5&&e7===e.id?3.5:.55+.65*i,o)
              }),eG.scale.set(1+.12*e9,1,1+.15*e9),eK.scale.set(1+.25*e9,1,1+.3*e9),ef.forEach(({
                g:e,vertical:t
              },i)=>{
                t?e.rotation.z=n*(i%2?-1:1)*1.1:e.rotation.y=n*(i%2?-1:1)*1.1
              }),e_.forEach((e,t)=>e.rotation.z=-n*(t?.65:.85)),eg.position.x=.42*Math.sin(s),eg.position.y=1.91+.055*Math.sin(2*s),ex.position.y=.25*a,ew.position.y=.04*Math.sin(s);
              let l=n/24%1,h="order"===e4?w((l-.88)/.12,0,1):a;
              eO.visible=ez.visible="order"!==e4||l>.88,eO.scale.y=.2+.8*Math.min(1,1.5*h),ez.position.set(1.04,2.7-Math.min(1,1.7*h)**2*2.17,.55),ez.rotation.y=3.5*n,ez.scale.setScalar(h>.9?1-(h-.9)*8:1);
              let c="order"===e4?Math.min(1,l/.15):a;
              if(eD.visible="order"!==e4||l<.15,eD.position.set(.24*Math.sin(c*Math.PI),2.9-1.9*c,1.1-.55*c),eD.rotation.z=-.14*Math.sin(c*Math.PI),eD.scale.setScalar(Math.min(1,8*c+.15,(1-c)*7+.1)),eb.forEach((e,t)=>e.rotation.x=Math.sin(s+t)>0?-.4:.4),(n-tu>1/18||tu<0)&&(v(n),x(n),eS.texture.needsUpdate=!0,updateTreads(n),tu=n),eQ.forEach((e,t)=>{
                let i,r=(n/24+t/6)%1;
                if(e.phase=r,r<.15){
                  i=0;
                  let t=r/.15;
                  e.group.position.copy(ec[
                    3
                  ].group.position).add(new I(0,1.6,.6)),tR.copy(ec[
                    0
                  ].group.position).add(new I(0,1.3,.65)),e.group.position.lerp(tR,t),e.group.position.y+=2*Math.sin(t*Math.PI),e.group.rotation.set(0,.28*Math.sin(t*Math.PI),-.1*Math.sin(t*Math.PI))
                }else{
                  let t=(r-.15)/.85*e2;
                  eH.getPointAt(t,e.group.position),e.group.position.x*=1+.12*e9,e.group.position.z*=1+.15*e9,e.group.position.y+=.43,e.group.rotation.set(0,.18,0),i=t<.7*e0?1:t<.96*e1?2:t<.83*e2?3:4
                }e.stage!==i&&(e.faces.forEach((e,t)=>e.visible=t===i),e.stage=i),e.group.visible="order"!==e4||0===t,e.halo.visible="order"===e4&&0===t,e.group.scale.setScalar("order"===e4?1.35:1),r>.94&&e.group.scale.multiplyScalar(Math.max(.05,(1-r)/.06))
              }),"order"===e4){
                let e=eQ[
                  0
                ],t=e.stage;
                t!==tL&&(r("journey-title").textContent=tP[
                  t
                ][
                  0
                ],r("journey-detail").textContent=tP[
                  t
                ][
                  1
                ],tL=t),r("journey-progress").style.width=100*e.phase+"%",!ta&&e6&&(tm.copy(e.group.position),tf.copy(tm).addScaledVector(tg,tn?10:15),th=!0)
              }else if("flight"===e5&&e6&&!ta){
                let e=.12*tc,t=t_*("stations"===e4?1.2:1);
                tm.set(0,1,0),tf.set(Math.sin(e+.55)*t*.83,t*(.5+.09*Math.sin(.7*e)),Math.cos(e+.55)*t*.83).add(tm),th=!0
              }else"station"===e5&&th&&b();
              if(th&&!ta){
                let e=1-Math.exp(-i*("order"===e4?2.2:3));
                G.position.lerp(tf,e),W.target.lerp(tm,e),"flight"!==e5&&"order"!==e4&&.015>G.position.distanceTo(tf)&&.015>W.target.distanceTo(tm)&&(th=!1)
              }W.autoRotate=e6&&!k&&!ta&&!th&&"order"!==e4&&"overview"===e5&&t-tr>6500,W.autoRotateSpeed=.24,W.update(i),ec.forEach((e,t)=>{
                let i="stations"===e4;
                if(e.label.classList.toggle("visible",i),!i)return;
                tC.copy(e.group.position).add(e.anchor).project(G);
                let n=tn?[
                  [
                    -30,25
                  ],[
                    -27,-50
                  ],[
                    15,-65
                  ],[
                    16,-1
                  ],[
                    -5,52
                  ]
                ]:[
                  [
                    -48,-14
                  ],[
                    -8,-64
                  ],[
                    30,-12
                  ],[
                    30,20
                  ],[
                    -12,40
                  ]
                ],r=(.5*tC.x+.5)*tt-40+n[
                  t
                ][
                  0
                ],a=(-(.5*tC.y)+.5)*ti-52+n[
                  t
                ][
                  1
                ];
                r=w(r,tn||!V?9:.425*tt,tt-(tn?123:165)),a=w(a,130,ti-200),e.label.style.transform=`translate(${r}px,${a}px)`
              }),F.render(H,G),!tx&&tv&&(tx=!0,window.parent.postMessage({
                type:"machine",event:"ready"
              },"*")),e6&&(tN++,(tU+=i)>4&&(tN/tU<43&&tO>1&&(tO=Math.max(1,tO-.25),F.setPixelRatio(tO)),tN=0,tU=0))
            }),i.push(()=>{
              cancelAnimationFrame(tF),W.dispose();
              let e=new Set;
              H.traverse(t=>{
                for(let i of(t.geometry&&t.geometry.dispose(),t.material?Array.isArray(t.material)?t.material:[
                  t.material
                ]:[
                  
                ])){
                  for(let t of Object.values(i))t instanceof K&&e.add(t);
                  i.dispose()
                }
              }),et.forEach(e=>e.dispose()),e.forEach(e=>e.dispose()),Y.dispose(),F.dispose(),F.forceContextLoss(),F.domElement.remove()
            }),F.compile(H,G),r("loading").classList.add("done"),r("error").style.display="none",Object.defineProperty(window,"__machineDebug",{
              value:{
                getState:()=>({
                  mode:e4,camera:e5,playing:e6,time:e8,spread:e9,cutHeight:eu.constant,width:tt,height:ti,embedded:V,drawCalls:F.info.render.calls,triangles:F.info.render.triangles,pixelRatio:F.getPixelRatio(),stations:ec.map(e=>{
                    let t=e.group.position.clone().add(new I(0,1,0)).project(G);
                    return{
                      id:e.id,x:(.5*t.x+.5)*tt,y:(-.5*t.y+.5)*ti
                    }
                  })
                })
              },configurable:!0
            }),i.push(()=>{
              delete window.__machineDebug
            })
          }catch(e){
            console.error("Machine: failed to start",e),a()
          }return()=>{
            for(let e of i.reverse())e();
            i.length=0
          }
        
}

export function Cyberdome3DMonitor({ className, style }: Cyberdome3DMonitorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled && container) {
        cleanup = initMachineScene(container, getComputedStyle(container).fontFamily);
      }
    });

    return () => {
      cancelled = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={"cyberdome-3d-monitor machine " + (className || "")}
      style={style}
    >
      <style dangerouslySetInnerHTML={{ __html: `
.cyberdome-3d-monitor {
  --bg: #0C1118;
  --white: #EAEEF5;
  --periwinkle: #8AA6D6;
  --amber-warm: #E4B894;
  --sage: #A8D5BA;
  --line: rgba(138, 166, 214, 0.15);
  --muted: #6B7A94;
  --glass-bg: rgba(21, 27, 38, 0.62);
  --glass-border: 1px solid rgba(255, 255, 255, 0.055);
  --glass-blur: blur(24px);
  
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: var(--bg);
  overflow: hidden;
  color: var(--white);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.cyberdome-3d-monitor * {
  box-sizing: border-box;
}

.cyberdome-3d-monitor #scene {
  width: 100%;
  height: 100%;
  display: block;
}

.cyberdome-3d-monitor canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.cyberdome-3d-monitor .vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(at 50% 50%, rgba(12, 17, 24, 0) 30%, rgba(12, 17, 24, 0.88) 100%);
}

.cyberdome-3d-monitor .topbar {
  position: absolute;
  top: 28px;
  left: 32px;
  right: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 5;
  pointer-events: none;
}

.cyberdome-3d-monitor .identity {
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: auto;
}

.cyberdome-3d-monitor .mark {
  width: 36px;
  height: 36px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(138, 166, 214, 0.3);
  border-radius: 9px;
  display: grid;
  place-items: center;
  color: #8AA6D6;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(138, 166, 214, 0.15);
  transition: border-color 0.3s ease;
}

.cyberdome-3d-monitor .mark:hover {
  border-color: rgba(138, 166, 214, 0.6);
}

.cyberdome-3d-monitor .identity strong {
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.2px;
  display: block;
  color: #EAEEF5;
}

.cyberdome-3d-monitor .identity small {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #6B7A94;
  margin-top: 3px;
  display: block;
}

.cyberdome-3d-monitor .status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: #9BAEC8;
  letter-spacing: 0.2px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  padding: 6px 14px;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}

.cyberdome-3d-monitor .status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #A8D5BA;
  box-shadow: 0 0 10px rgba(168, 213, 186, 0.7);
  animation: pulse-dot 2.5s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.25); box-shadow: 0 0 14px rgba(168, 213, 186, 1); }
}

.cyberdome-3d-monitor .status.paused i {
  background: #E4B894;
  box-shadow: 0 0 10px rgba(228, 184, 148, 0.4);
  animation: none;
}

.cyberdome-3d-monitor .status span:last-child {
  color: #6B7A94;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  margin-left: 8px;
}

.cyberdome-3d-monitor .scene-heading {
  position: absolute;
  top: 92px;
  left: 24%;
  right: 24%;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: #6B7A94;
  pointer-events: none;
}

.cyberdome-3d-monitor .scene-heading:before {
  content: "";
  width: 22px;
  height: 1px;
  background: #8AA6D6;
}

.cyberdome-3d-monitor .scene-heading .index {
  margin-left: auto;
  color: #4A5A72;
  letter-spacing: 1px;
}

.cyberdome-3d-monitor .coordinates {
  position: absolute;
  top: 136px;
  right: 32px;
  writing-mode: vertical-rl;
  font: 9px 'JetBrains Mono', ui-monospace, Menlo, monospace;
  letter-spacing: 1.8px;
  color: #4A5A72;
  pointer-events: none;
}

.cyberdome-3d-monitor .controls {
  position: absolute;
  bottom: 56px;
  left: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 5;
}

.cyberdome-3d-monitor .mode-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
}

.cyberdome-3d-monitor .mode-bar button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #9BAEC8;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
}

.cyberdome-3d-monitor .mode-bar button svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.cyberdome-3d-monitor .mode-bar button:hover {
  color: #EAEEF5;
  background: rgba(138, 166, 214, 0.08);
}

.cyberdome-3d-monitor .mode-bar button[aria-pressed="true"] {
  background: #8AA6D6;
  color: #0C1118;
  font-weight: 600;
  box-shadow: 0 2px 14px rgba(138, 166, 214, 0.4);
}

.cyberdome-3d-monitor .camera-row {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(21, 27, 38, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.035);
  padding: 4px 12px;
  border-radius: 20px;
}

.cyberdome-3d-monitor .camera-row .caption {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 1.4px;
  color: #6B7A94;
  margin-right: 6px;
}

.cyberdome-3d-monitor .camera-row button {
  padding: 4px 8px;
  border: 0;
  background: transparent;
  color: #6B7A94;
  font-size: 10px;
  cursor: pointer;
  transition: color 0.2s ease;
  position: relative;
}

.cyberdome-3d-monitor .camera-row button:hover,
.cyberdome-3d-monitor .camera-row button[aria-pressed="true"] {
  color: #EAEEF5;
}

.cyberdome-3d-monitor .camera-row button[aria-pressed="true"]:after {
  content: "";
  display: block;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #8AA6D6;
  margin: 4px auto -6px;
  box-shadow: 0 0 6px #8AA6D6;
}

.cyberdome-3d-monitor .camera-row .divider {
  width: 1px;
  height: 12px;
  background: rgba(138, 166, 214, 0.18);
  margin: 0 6px;
}

.cyberdome-3d-monitor .camera-row #play {
  width: 24px;
  height: 24px;
  padding: 4px;
  display: grid;
  place-items: center;
  border-radius: 4px;
}

.cyberdome-3d-monitor .camera-row #play:hover {
  background: rgba(138, 166, 214, 0.12);
}

.cyberdome-3d-monitor .footer {
  position: absolute;
  bottom: 20px;
  left: 32px;
  right: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  pointer-events: none;
}

.cyberdome-3d-monitor .wordmark {
  color: #6B7A94;
  pointer-events: auto;
  letter-spacing: -0.1px;
  font-size: 11px;
}

.cyberdome-3d-monitor .wordmark span {
  color: #8AA6D6;
}

.cyberdome-3d-monitor .footer-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font: 9px 'JetBrains Mono', ui-monospace, Menlo, monospace;
  letter-spacing: 1.6px;
  color: #4A5A72;
}

.cyberdome-3d-monitor .hint {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6B7A94;
  font-size: 10px;
}

.cyberdome-3d-monitor .hint svg {
  color: #8AA6D6;
}

.cyberdome-3d-monitor #labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.cyberdome-3d-monitor .station-label {
  position: absolute;
  top: 0;
  left: 0;
  min-width: 138px;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  will-change: transform;
}

.cyberdome-3d-monitor .station-label.visible {
  opacity: 1;
}

.cyberdome-3d-monitor .station-label .stem {
  width: 1px;
  height: 26px;
  background: linear-gradient(rgba(138, 166, 214, 0), rgba(138, 166, 214, 0.65));
  margin-left: 10px;
}

.cyberdome-3d-monitor .station-label .label-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(138, 166, 214, 0.35);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(138, 166, 214, 0.12);
}

.cyberdome-3d-monitor .station-label .label-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #EAEEF5;
  white-space: nowrap;
}

.cyberdome-3d-monitor .station-label .label-title span {
  font: 9px 'JetBrains Mono', ui-monospace, Menlo, monospace;
  color: #8AA6D6;
}

.cyberdome-3d-monitor .station-label .label-meta {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  color: #9BAEC8;
  margin: 4px 0 0 20px;
  white-space: nowrap;
}

.cyberdome-3d-monitor #tooltip {
  position: absolute;
  z-index: 10;
  max-width: 250px;
  padding: 12px 16px;
  background: rgba(21, 27, 38, 0.75);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(138, 166, 214, 0.28);
  border-radius: 9px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55), 0 0 20px rgba(138, 166, 214, 0.15);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease-out;
}

.cyberdome-3d-monitor #tooltip.visible {
  opacity: 1;
}

.cyberdome-3d-monitor #tooltip strong {
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #EAEEF5;
}

.cyberdome-3d-monitor #tooltip strong span {
  color: #8AA6D6;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 10px;
  margin-right: 8px;
}

.cyberdome-3d-monitor #tooltip p {
  font-size: 10px;
  line-height: 1.5;
  color: #9BAEC8;
  margin: 6px 0 0;
}

.cyberdome-3d-monitor #journey {
  position: absolute;
  top: 132px;
  left: 24%;
  right: 24%;
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: all 0.4s ease;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  padding: 8px 16px;
  border-radius: 12px;
}

.cyberdome-3d-monitor #journey.visible {
  opacity: 1;
  transform: none;
}

.cyberdome-3d-monitor .journey-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(138, 166, 214, 0.4);
  background: rgba(21, 27, 38, 0.8);
  display: grid;
  place-items: center;
  color: #8AA6D6;
}

.cyberdome-3d-monitor #journey strong {
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #EAEEF5;
  display: block;
}

.cyberdome-3d-monitor #journey small {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  color: #9BAEC8;
  display: block;
  margin-top: 2px;
}

.cyberdome-3d-monitor #journey .track {
  flex: 1;
  height: 2px;
  background: rgba(138, 166, 214, 0.15);
  margin-left: 8px;
  border-radius: 1px;
  overflow: hidden;
}

.cyberdome-3d-monitor #journey .track i {
  display: block;
  height: 100%;
  width: 0;
  background: #8AA6D6;
  box-shadow: 0 0 8px rgba(138, 166, 214, 0.8);
}

.cyberdome-3d-monitor #loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  z-index: 20;
  transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s ease;
  pointer-events: none;
}

.cyberdome-3d-monitor #loading.done {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.96);
  pointer-events: none;
}

.cyberdome-3d-monitor .cyber-radar-loader {
  position: relative;
  width: 120px;
  height: 120px;
  display: grid;
  place-items: center;
}

.cyberdome-3d-monitor .sonar-emitter {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.cyberdome-3d-monitor .sonar-wave {
  position: absolute;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 1px solid rgba(138, 166, 214, 0.45);
  box-shadow: 0 0 10px rgba(138, 166, 214, 0.25);
  animation: sonar-pulse 3s cubic-bezier(0.1, 0.2, 0.4, 1) infinite;
  opacity: 0;
}

.cyberdome-3d-monitor .sonar-wave-1 {
  animation-delay: 0s;
}

.cyberdome-3d-monitor .sonar-wave-2 {
  animation-delay: 1s;
}

.cyberdome-3d-monitor .sonar-wave-3 {
  animation-delay: 2s;
}

@keyframes sonar-pulse {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
  }
  50% {
    opacity: 0.35;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

.cyberdome-3d-monitor .radar-grid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.cyberdome-3d-monitor .radar-scanner {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  animation: radar-sweep 2.8s linear infinite;
  transform-origin: center center;
  pointer-events: none;
}

.cyberdome-3d-monitor .radar-beam {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg at 50% 50%,
    rgba(138, 166, 214, 0.35) 0deg,
    rgba(168, 213, 186, 0.15) 45deg,
    transparent 70deg,
    transparent 360deg
  );
  mask-image: radial-gradient(circle at center, transparent 20%, black 22%);
  -webkit-mask-image: radial-gradient(circle at center, transparent 20%, black 22%);
}

.cyberdome-3d-monitor .radar-sweep-line {
  position: absolute;
  top: 6px;
  left: 50%;
  width: 1.5px;
  height: calc(50% - 6px);
  background: linear-gradient(180deg, #A8D5BA 0%, rgba(138, 166, 214, 0.6) 70%, transparent 100%);
  transform: translateX(-50%);
  box-shadow: 0 0 8px #A8D5BA, 0 0 16px rgba(168, 213, 186, 0.6);
}

@keyframes radar-sweep {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.cyberdome-3d-monitor .orbit-track {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.cyberdome-3d-monitor .orbit-track-outer {
  inset: 6px;
  animation: orbit-rotate-cw 6s linear infinite;
}

.cyberdome-3d-monitor .orbit-track-inner {
  inset: 18px;
  animation: orbit-rotate-ccw 4.2s linear infinite;
}

.cyberdome-3d-monitor .satellite-node {
  position: absolute;
  border-radius: 50%;
}

.cyberdome-3d-monitor .node-1 {
  top: 0;
  left: 50%;
  width: 5px;
  height: 5px;
  background: #A8D5BA;
  box-shadow: 0 0 8px #A8D5BA, 0 0 14px rgba(168, 213, 186, 0.7);
  transform: translate(-50%, -50%);
}

.cyberdome-3d-monitor .node-2 {
  bottom: 12px;
  right: 6px;
  width: 4px;
  height: 4px;
  background: #E4B894;
  box-shadow: 0 0 6px #E4B894;
  transform: translate(50%, 50%);
}

.cyberdome-3d-monitor .node-3 {
  top: 30%;
  left: 0;
  width: 4px;
  height: 4px;
  background: #8AA6D6;
  box-shadow: 0 0 8px #8AA6D6;
  transform: translate(-50%, -50%);
}

@keyframes orbit-rotate-cw {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes orbit-rotate-ccw {
  from {
    transform: rotate(360deg);
  }
  to {
    transform: rotate(0deg);
  }
}

.cyberdome-3d-monitor .cyber-shield-container {
  position: relative;
  z-index: 2;
  width: 44px;
  height: 50px;
  display: grid;
  place-items: center;
  animation: shield-glow 2.5s ease-in-out infinite alternate;
}

.cyberdome-3d-monitor .shield-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 10px rgba(138, 166, 214, 0.45));
}

@keyframes shield-glow {
  0% {
    transform: scale(0.97);
    filter: drop-shadow(0 0 6px rgba(138, 166, 214, 0.35));
  }
  100% {
    transform: scale(1.03);
    filter: drop-shadow(0 0 16px rgba(168, 213, 186, 0.65)) drop-shadow(0 0 24px rgba(138, 166, 214, 0.4));
  }
}

.cyberdome-3d-monitor .loader-hud {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.cyberdome-3d-monitor .loader-label {
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 2.2px;
  color: #EAEEF5;
  text-shadow: 0 0 10px rgba(138, 166, 214, 0.6);
  animation: label-pulse 2s ease-in-out infinite alternate;
}

@keyframes label-pulse {
  0% { opacity: 0.75; }
  100% { opacity: 1; }
}

.cyberdome-3d-monitor .loader-progress-track {
  width: 170px;
  height: 3px;
  background: rgba(138, 166, 214, 0.12);
  border: 1px solid rgba(138, 166, 214, 0.25);
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
}

.cyberdome-3d-monitor .loader-progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 45%;
  height: 100%;
  background: linear-gradient(90deg, transparent, #8AA6D6 40%, #A8D5BA 80%, #EAEEF5 100%);
  border-radius: 9999px;
  box-shadow: 0 0 8px #A8D5BA;
  animation: scanner-bar 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes scanner-bar {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(380%);
  }
}

.cyberdome-3d-monitor .loader-telemetry {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 8.5px;
  letter-spacing: 1.2px;
  color: #8AA6D6;
  opacity: 0.75;
}

.cyberdome-3d-monitor .loader-telemetry .dot {
  color: rgba(228, 184, 148, 0.6);
}

.cyberdome-3d-monitor #error {
  position: absolute;
  top: 40%;
  left: 28%;
  right: 28%;
  padding: 24px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(228, 184, 148, 0.3);
  border-radius: 12px;
  display: none;
  font-size: 13px;
  line-height: 1.6;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
}

.cyberdome-3d-monitor #error strong {
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  color: #E4B894;
  font-weight: 600;
}

.cyberdome-3d-monitor #error p {
  color: #9BAEC8;
  margin: 8px 0 0;
}

.cyberdome-3d-monitor #error button {
  margin-top: 14px;
  padding: 8px 16px;
  background: #1C2433;
  border: 1px solid rgba(138, 166, 214, 0.25);
  border-radius: 6px;
  color: #EAEEF5;
  cursor: pointer;
  transition: all 0.2s;
}

.cyberdome-3d-monitor #error button:hover {
  background: #252F42;
  border-color: #8AA6D6;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .cyberdome-3d-monitor .topbar { top: 16px; left: 16px; right: 16px; }
  .cyberdome-3d-monitor .scene-heading { left: 16px; right: 16px; top: 76px; }
  .cyberdome-3d-monitor .coordinates { display: none; }
  .cyberdome-3d-monitor .footer { left: 16px; right: 16px; bottom: 16px; }
  .cyberdome-3d-monitor .footer-center { display: none; }
  .cyberdome-3d-monitor .controls { bottom: 64px; left: 12px; right: 12px; }
  .cyberdome-3d-monitor .mode-bar button { padding: 7px 9px; font-size: 10px; }
}
` }} />
      <main
        id="scene"
        role="img"
        aria-label="Interactive 3D CYBERDOME Defense Grid with five nodes: Sensor Ingress, ML Fusion, AI Copilot, Command Center, and SOAR Engine. Drag to rotate, scroll or pinch to zoom. Hover or tap a node to inspect."
      />
      <div className="vignette" />
      <header className="topbar debug-ui">
        <div className="identity">
          <div className="mark">
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2L3 5v6c0 5 7 8 7 8s7-3 7-8V5l-7-3z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <strong>Cyber Dome Core</strong>
            <small>Threat Analysis Engine</small>
          </div>
        </div>
        <div className="status" id="status">
          <i />
          <span id="status-text">Shield Active</span>
          <span>GRID 001</span>
        </div>
      </header>
      <div className="scene-heading debug-ui">
        AUTONOMOUS DEFENSE PLATFORM <span className="index">5 NODES / ZERO-TRUST</span>
      </div>
      <div className="coordinates debug-ui">DEFENSE GRID 001 — INGRESS TO CONTAINMENT</div>
      <div id="journey" className="debug-ui">
        <div className="journey-icon">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1.5L2 4v4c0 3.5 6 6.5 6 6.5s6-3 6-6.5V4l-6-2.5z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <strong id="journey-title">Threat Ingress</strong>
          <small id="journey-detail">Sensor Ingress · packet detected at perimeter</small>
        </div>
        <div className="track">
          <i id="journey-progress" />
        </div>
      </div>
      <div id="labels" />
      <div id="tooltip" role="tooltip">
        <strong />
        <p />
      </div>
      <div className="controls debug-ui">
        <nav className="mode-bar" aria-label="Defense Grid Mode">
          <button data-mode="assembled" aria-pressed="true">
            <svg viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.5l6 3.3v6.4l-6 3.3-6-3.3V4.8L8 1.5zM2 4.8l6 3.4 6-3.4M8 8.2v6.3"
                stroke="currentColor"
                strokeLinejoin="round"
              />
            </svg>
            Global View
          </button>
          <button data-mode="cutaway" aria-pressed="false">
            <svg viewBox="0 0 16 16" fill="none">
              <path
                d="M3 2h10v12H3zM8 2v12M10.5 4l2.5 2.5m-2.5 0L13 9m-2.5 0 2.5 2.5"
                stroke="currentColor"
                strokeLinejoin="round"
              />
            </svg>
            Internal Logic
          </button>
          <button data-mode="stations" aria-pressed="false">
            <svg viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.5l6 3-6 3-6-3 6-3zM2 8l6 3 6-3M2 11.5l6 3 6-3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Defense Nodes
          </button>
          <button data-mode="order" aria-pressed="false">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M5 2.5l8 5.5-8 5.5v-11z" stroke="currentColor" strokeLinejoin="round" />
            </svg>
            Trace Threat
          </button>
        </nav>
        <nav className="camera-row" aria-label="Camera Presets">
          <span className="caption">VIEW</span>
          <button data-camera="overview" aria-pressed="true">Overview</button>
          <button data-camera="side" aria-pressed="false">Side</button>
          <button data-camera="top" aria-pressed="false">Top</button>
          <button data-camera="station" aria-pressed="false">Node</button>
          <button data-camera="flight" aria-pressed="false">Flyby</button>
          <span className="divider" />
          <button id="play" aria-label="Pause the animation" aria-pressed="false">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="1" width="2.5" height="10" rx=".5" />
              <rect x="7.5" y="1" width="2.5" height="10" rx=".5" />
            </svg>
          </button>
        </nav>
      </div>
      <footer className="footer">
        <div className="wordmark">
          CYBERDOME · <span>Quiet Security</span>
        </div>
        <span className="footer-center debug-ui">SECURED BY AI AGENTS</span>
        <span className="hint debug-ui">
          <svg width="13" height="16" viewBox="0 0 13 16" fill="none">
            <rect x="2" y="1" width="9" height="14" rx="4.5" stroke="currentColor" />
            <path d="M6.5 4v3" stroke="currentColor" strokeLinecap="round" />
          </svg>
          Rotate. Zoom. Explore.
        </span>
      </footer>
      <div id="loading">
        <div className="cyber-radar-loader">
          {/* Sonar pulse wave ripples */}
          <div className="sonar-emitter">
            <span className="sonar-wave sonar-wave-1" />
            <span className="sonar-wave sonar-wave-2" />
            <span className="sonar-wave sonar-wave-3" />
          </div>

          {/* Radar background grid & rings */}
          <svg className="radar-grid" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="54" stroke="rgba(138, 166, 214, 0.2)" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx="60" cy="60" r="42" stroke="rgba(138, 166, 214, 0.3)" strokeWidth="1" />
            <circle cx="60" cy="60" r="28" stroke="rgba(138, 166, 214, 0.25)" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="60" y1="6" x2="60" y2="114" stroke="rgba(138, 166, 214, 0.15)" strokeWidth="1" strokeDasharray="2 4" />
            <line x1="6" y1="60" x2="114" y2="60" stroke="rgba(138, 166, 214, 0.15)" strokeWidth="1" strokeDasharray="2 4" />
            <line x1="60" y1="4" x2="60" y2="10" stroke="#8AA6D6" strokeWidth="1.5" />
            <line x1="60" y1="110" x2="60" y2="116" stroke="#8AA6D6" strokeWidth="1.5" />
            <line x1="4" y1="60" x2="10" y2="60" stroke="#8AA6D6" strokeWidth="1.5" />
            <line x1="110" y1="60" x2="116" y2="60" stroke="#8AA6D6" strokeWidth="1.5" />
          </svg>

          {/* Sweeping Radar Scanner (360-degree rotating cone/beam) */}
          <div className="radar-scanner">
            <div className="radar-beam" />
            <div className="radar-sweep-line" />
          </div>

          {/* Orbiting Satellite Data Nodes */}
          <div className="orbit-track orbit-track-outer">
            <span className="satellite-node node-1" />
            <span className="satellite-node node-2" />
          </div>
          <div className="orbit-track orbit-track-inner">
            <span className="satellite-node node-3" />
          </div>

          {/* Center Holographic Cyber Shield with Lock Core */}
          <div className="cyber-shield-container">
            <svg className="shield-svg" viewBox="0 0 40 46" fill="none">
              <defs>
                <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8AA6D6" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#A8D5BA" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8AA6D6" stopOpacity="0.9" />
                </linearGradient>
                <radialGradient id="shieldGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#8AA6D6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#8AA6D6" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="20" cy="22" r="18" fill="url(#shieldGlow)" />
              <path
                d="M20 3L6 8v12c0 10.5 6 18 14 21 8-3 14-10.5 14-21V8L20 3z"
                stroke="url(#shieldGrad)"
                strokeWidth="2"
                strokeLinejoin="round"
                fill="rgba(21, 27, 38, 0.75)"
              />
              <path
                d="M20 7L9.5 11v9.5c0 8.2 4.5 14.5 10.5 17 6-2.5 10.5-8.8 10.5-17V11L20 7z"
                stroke="rgba(138, 166, 214, 0.35)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M17 19v-2.5a3 3 0 016 0V19"
                stroke="#A8D5BA"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <rect
                x="15"
                y="19"
                width="10"
                height="8"
                rx="2"
                fill="#1C2433"
                stroke="#A8D5BA"
                strokeWidth="1.4"
              />
              <circle cx="20" cy="22.5" r="1" fill="#EAEEF5" />
              <line x1="20" y1="23.5" x2="20" y2="25" stroke="#EAEEF5" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Loader Status & Telemetry */}
        <div className="loader-hud">
          <div className="loader-label">CALIBRATING DEFENSE GRID...</div>
          <div className="loader-progress-track">
            <div className="loader-progress-bar" />
          </div>
          <div className="loader-telemetry">
            <span>RADAR: ACTIVE</span>
            <span className="dot">·</span>
            <span>NODES: 5 ONLINE</span>
            <span className="dot">·</span>
            <span>SHIELD: LOCKING</span>
          </div>
        </div>
      </div>
      <div id="error" role="alert">
        <strong>Could not start 3D defense monitor</strong>
        <p>Check that WebGL is enabled in your browser.</p>
        <button onClick={() => location.reload()}>Try again</button>
      </div>
    </div>
  );
}

export default Cyberdome3DMonitor;
