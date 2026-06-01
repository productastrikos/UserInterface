import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DOMAINS, RULE_CORPUS } from '../services/hslKnowledge';

// ── Compliance hotspots placed along the ship hull (x along keel) ───────────
const HOTSPOTS = [
  { id:'H1', x:-22, y: 4.0, z: 0,    domain:'Hull',       label:'Bow / Collision Bulkhead', severity:'critical', ruleId:'IRS-P3-C6-S4',   note:'Fr84 spacing exceeds 30 frame max'},
  { id:'H2', x: -8, y: 2.5, z: 0,    domain:'Hull',       label:'Shell Plate at Fr112',     severity:'high',     ruleId:'IRS-P3-C6-S2',   note:'12.5 mm vs 13.0 mm IRS 2024'},
  { id:'H3', x:  2, y: 6.5, z: 0,    domain:'Electrical', label:'Main Switchboard Room',     severity:'medium',   ruleId:'IEC-60092-352',  note:'Cable tray T-E-204 segregation 80 mm'},
  { id:'H4', x:  8, y: 4.5, z: 2.0,  domain:'HVAC',       label:'Engine Room HVAC SF-1',     severity:'medium',   ruleId:'DNV-P4-C7-S2',   note:'No N+1 redundancy'},
  { id:'H5', x: 14, y:-1.0, z: 0,    domain:'Piping',     label:'Bilge OWS / MARPOL',        severity:'high',     ruleId:'IMO-MARPOL-A1-R14', note:'Missing 15 ppm interlock'},
  { id:'H6', x: 18, y: 3.0, z:-2.0,  domain:'Mechanical', label:'Propulsion Shaft',          severity:'low',      ruleId:'ABS-P4-C2',      note:'Shaft diameter within tolerance'},
  { id:'H7', x: 22, y: 7.0, z: 0,    domain:'Outfit',     label:'Combat System Mounts',      severity:'critical', ruleId:'IRS-NAVAL-V2',   note:'Shock-grade A isolators unspecified'},
];

const SEV_COLOR = { critical:0xef4444, high:0xf97316, medium:0xf59e0b, low:0x10b981 };
const SEV_HEX   = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#10b981' };

// ── Build a stylised ship hull as a Three.js group ──────────────────────────
function buildShipGroup() {
  const group = new THREE.Group();

  // Hull lower (lathed half-ellipse stretched along x)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-25, 0);
  hullShape.bezierCurveTo(-25, -3, -22, -5, 0, -5);
  hullShape.bezierCurveTo(22, -5, 25, -3, 25, 0);
  hullShape.lineTo(-25, 0);

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 8, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.5, bevelThickness: 0.5 });
  hullGeo.translate(0, 0, -4);
  const hullMat = new THREE.MeshPhongMaterial({ color: 0x1e3a5f, shininess: 40, side: THREE.DoubleSide });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  group.add(hull);

  // Main deck (flat)
  const deckGeo = new THREE.BoxGeometry(50, 0.4, 8);
  const deckMat = new THREE.MeshPhongMaterial({ color: 0x475569 });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.set(0, 0, 0);
  group.add(deck);

  // Superstructure (block forward)
  const superGeo = new THREE.BoxGeometry(12, 4, 6);
  const superMat = new THREE.MeshPhongMaterial({ color: 0x64748b });
  const supr = new THREE.Mesh(superGeo, superMat);
  supr.position.set(2, 2, 0);
  group.add(supr);

  // Bridge tower
  const bridgeGeo = new THREE.BoxGeometry(6, 2, 4);
  const bridge = new THREE.Mesh(bridgeGeo, superMat);
  bridge.position.set(0, 5, 0);
  group.add(bridge);

  // Mast
  const mastGeo = new THREE.CylinderGeometry(0.15, 0.3, 8, 8);
  const mastMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8 });
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.set(0, 9, 0);
  group.add(mast);

  // Funnel
  const funnelGeo = new THREE.CylinderGeometry(1.0, 1.2, 3.5, 16);
  const funnelMat = new THREE.MeshPhongMaterial({ color: 0x0f172a });
  const funnel = new THREE.Mesh(funnelGeo, funnelMat);
  funnel.position.set(8, 3.75, 0);
  group.add(funnel);

  // Bulkheads (vertical lines along hull length) — visible compliance frames
  const bhdMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
  for (let i = -22; i <= 22; i += 6) {
    const pts = [ new THREE.Vector3(i, -4.5, -4), new THREE.Vector3(i, 0, -4), new THREE.Vector3(i, 0, 4), new THREE.Vector3(i, -4.5, 4) ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, bhdMat);
    group.add(line);
  }

  // Waterline (plane)
  const wlGeo = new THREE.PlaneGeometry(70, 30);
  const wlMat = new THREE.MeshPhongMaterial({ color: 0x0c4a6e, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
  const wl = new THREE.Mesh(wlGeo, wlMat);
  wl.rotation.x = -Math.PI / 2;
  wl.position.y = -1.8;
  group.add(wl);

  // Bow point indicator (sphere)
  const bowGeo = new THREE.SphereGeometry(0.4, 16, 16);
  const bowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const bow = new THREE.Mesh(bowGeo, bowMat);
  bow.position.set(-25, 0, 0);
  group.add(bow);

  return group;
}

// ── Hotspot sphere with pulsing halo ────────────────────────────────────────
function buildHotspot(h) {
  const grp = new THREE.Group();
  grp.position.set(h.x, h.y, h.z);
  grp.userData = h;
  const color = SEV_COLOR[h.severity] ?? 0x38bdf8;

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 24, 24),
    new THREE.MeshBasicMaterial({ color })
  );
  grp.add(sphere);

  const haloMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 32), haloMat);
  halo.lookAt(0, 1, 0); // orient roughly upward
  halo.userData.kind = 'halo';
  grp.add(halo);

  return grp;
}

export default function Visualizer3D() {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const [activeDomains, setActiveDomains] = useState(() => new Set(DOMAINS));
  const [selected, setSelected] = useState(null);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showWaterline, setShowWaterline] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  // ── three.js scene setup ──────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050816);
    scene.fog = new THREE.Fog(0x050816, 50, 110);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(40, 30, 50);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(30, 50, 20);
    scene.add(dir);
    const rim = new THREE.PointLight(0x38bdf8, 0.6, 60);
    rim.position.set(-20, 10, -20);
    scene.add(rim);

    // Grid floor
    const grid = new THREE.GridHelper(120, 30, 0x1e293b, 0x0f172a);
    grid.position.y = -6;
    scene.add(grid);

    // Ship
    const ship = buildShipGroup();
    scene.add(ship);

    // Hotspots layer
    const hotspotsGroup = new THREE.Group();
    HOTSPOTS.forEach(h => hotspotsGroup.add(buildHotspot(h)));
    scene.add(hotspotsGroup);

    // Raycaster for hover/click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const objs = [];
      hotspotsGroup.children.forEach(g => g.children.forEach(c => { if (c.userData.kind !== 'halo') objs.push(c); }));
      const hits = raycaster.intersectObjects(objs, false);
      if (hits.length > 0) {
        const parent = hits[0].object.parent;
        if (parent?.userData?.id) setSelected(parent.userData);
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // Simple drag-to-orbit (azimuth + elevation around origin)
    let dragging = false;
    let lastX = 0, lastY = 0;
    let azim = Math.atan2(camera.position.z, camera.position.x);
    let elev = Math.atan2(camera.position.y, Math.hypot(camera.position.x, camera.position.z));
    let radius = camera.position.length();
    const updateCamera = () => {
      camera.position.x = radius * Math.cos(elev) * Math.cos(azim);
      camera.position.z = radius * Math.cos(elev) * Math.sin(azim);
      camera.position.y = radius * Math.sin(elev);
      camera.lookAt(0, 0, 0);
    };
    const onDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onUp = () => { dragging = false; };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      azim -= dx * 0.005;
      elev = Math.max(-1.2, Math.min(1.4, elev + dy * 0.005));
      updateCamera();
    };
    const onWheel = (e) => {
      radius = Math.max(20, Math.min(120, radius + e.deltaY * 0.05));
      updateCamera();
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    // Resize
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    let rafId;
    let t0 = performance.now();
    const animate = () => {
      const t = performance.now();
      const dt = (t - t0) / 1000; t0 = t;

      if (stateRef.current.autoRotate) { azim += dt * 0.18; updateCamera(); }

      // Pulse halo scale
      hotspotsGroup.children.forEach(g => {
        const halo = g.children.find(c => c.userData.kind === 'halo');
        if (halo) {
          const s = 1 + 0.25 * Math.sin(t * 0.004 + g.position.x);
          halo.scale.set(s, s, s);
          halo.lookAt(camera.position);
        }
      });

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    animate();

    stateRef.current = { scene, camera, renderer, ship, hotspotsGroup, autoRotate: true };

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ── React state → scene sync ──────────────────────────────────────────────
  useEffect(() => { stateRef.current.autoRotate = autoRotate; }, [autoRotate]);

  useEffect(() => {
    const { ship } = stateRef.current;
    if (!ship) return;
    ship.traverse(o => {
      if (o.isMesh && o.material) {
        o.material.wireframe = showWireframe;
      }
    });
  }, [showWireframe]);

  useEffect(() => {
    const { ship } = stateRef.current;
    if (!ship) return;
    // The 5th child (index 4) — added in buildShipGroup order is waterline
    // Find by approximate position (y=-1.8 & PlaneGeometry)
    ship.children.forEach(c => {
      if (c.geometry?.type === 'PlaneGeometry' && c.position.y < -1) {
        c.visible = showWaterline;
      }
    });
  }, [showWaterline]);

  useEffect(() => {
    const { hotspotsGroup } = stateRef.current;
    if (!hotspotsGroup) return;
    hotspotsGroup.children.forEach(g => {
      g.visible = activeDomains.has(g.userData.domain);
    });
  }, [activeDomains]);

  const toggleDomain = (d) => {
    setActiveDomains(prev => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  };

  const visibleHotspots = HOTSPOTS.filter(h => activeDomains.has(h.domain));
  const counts = {
    total: visibleHotspots.length,
    critical: visibleHotspots.filter(h => h.severity === 'critical').length,
    high: visibleHotspots.filter(h => h.severity === 'high').length,
  };

  const selRule = selected ? RULE_CORPUS.find(r => r.id === selected.ruleId) : null;

  return (
    <div className="h-full overflow-hidden flex flex-col p-1">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">3D Design Viewer</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Interactive ship model with live compliance overlays · drag to orbit · scroll to zoom · click hotspots
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-1 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold uppercase tracking-widest">three.js · WebGL</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 flex-1 min-h-0">
        {/* Controls / legend */}
        <div className="space-y-3 lg:col-span-1 overflow-y-auto">
          <div className="bg-app-panel border border-app-border rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">View</div>
            <label className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5 cursor-pointer">
              Auto-rotate
              <input type="checkbox" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)} className="accent-sky-500" />
            </label>
            <label className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5 cursor-pointer">
              Wireframe
              <input type="checkbox" checked={showWireframe} onChange={e => setShowWireframe(e.target.checked)} className="accent-sky-500" />
            </label>
            <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer">
              Waterline
              <input type="checkbox" checked={showWaterline} onChange={e => setShowWaterline(e.target.checked)} className="accent-sky-500" />
            </label>
          </div>

          <div className="bg-app-panel border border-app-border rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Compliance Layers</div>
            {DOMAINS.map(d => {
              const active = activeDomains.has(d);
              const dCount = HOTSPOTS.filter(h => h.domain === d).length;
              return (
                <button
                  key={d}
                  onClick={() => toggleDomain(d)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded mb-1 text-[11px] font-semibold transition-colors border ${
                    active
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-200'
                      : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span>{d}</span>
                  <span className="text-[10px] font-mono">{dCount}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-app-panel border border-app-border rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Severity Legend</div>
            {Object.entries(SEV_HEX).map(([k, c]) => (
              <div key={k} className="flex items-center gap-2 text-[11px] text-slate-300 mb-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                <span className="capitalize">{k}</span>
              </div>
            ))}
          </div>

          <div className="bg-app-panel border border-app-border rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Live Counts</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-base font-bold text-white">{counts.total}</div><div className="text-[9px] text-slate-500 uppercase">Visible</div></div>
              <div><div className="text-base font-bold text-red-400">{counts.critical}</div><div className="text-[9px] text-slate-500 uppercase">Critical</div></div>
              <div><div className="text-base font-bold text-orange-400">{counts.high}</div><div className="text-[9px] text-slate-500 uppercase">High</div></div>
            </div>
          </div>
        </div>

        {/* 3D canvas */}
        <div className="lg:col-span-2 bg-app-panel border border-app-border rounded-xl overflow-hidden relative min-h-[420px]">
          <div ref={mountRef} className="w-full h-full" />
          {/* Heads-up overlay */}
          <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-300 font-mono">
            <div><span className="text-slate-500">Vessel:</span> HSL-2026-001</div>
            <div><span className="text-slate-500">Class:</span> IRS · Naval</div>
            <div><span className="text-slate-500">LBP / Beam:</span> 105 m / 14 m</div>
          </div>
          <div className="absolute bottom-3 right-3 bg-slate-950/70 backdrop-blur border border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-400 font-mono flex items-center gap-3">
            <span>🖱 Drag · Scroll · Click hotspot</span>
          </div>
        </div>

        {/* Selected hotspot details */}
        <div className="bg-app-panel border border-app-border rounded-xl p-3 lg:col-span-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Selection</div>
          {!selected && (
            <div className="text-[11px] text-slate-500">Click any hotspot in the model to view its compliance details, applicable rule excerpt and remediation steps.</div>
          )}
          {selected && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border"
                    style={{ background: `${SEV_HEX[selected.severity]}22`, color: SEV_HEX[selected.severity], borderColor: `${SEV_HEX[selected.severity]}55` }}>{selected.severity}</span>
                  <span className="text-[9px] font-bold uppercase bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{selected.domain}</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-2">{selected.label}</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">{selected.note}</p>
              </div>
              {selRule && (
                <div className="bg-slate-950/40 border border-app-border rounded-lg p-2.5">
                  <div className="text-[10px] font-bold text-sky-400 font-mono">{selRule.id}</div>
                  <div className="text-[11px] font-semibold text-slate-200 mt-0.5">{selRule.title}</div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{selRule.excerpt}</p>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">Remediation</div>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  <li className="flex gap-1.5">▸ Re-issue affected drawing</li>
                  <li className="flex gap-1.5">▸ Update Build Spec section</li>
                  <li className="flex gap-1.5">▸ Notify surveyor / Class society</li>
                  <li className="flex gap-1.5">▸ Re-run Validator scan</li>
                </ul>
              </div>
              <button onClick={() => setSelected(null)} className="w-full text-[10px] py-1.5 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:text-white">Clear selection</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
