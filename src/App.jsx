import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Stars as ThreeStars } from "@react-three/drei";
import * as THREE from "three";

const RESUME = {
  name: "Gowtham K",
  contact: {
    github: "dovakin0007",
    githubUrl: "https://github.com/dovakin0007",
    email: "dovakin0007@gmail.com",
    phone: "8939411398",
  },
  summary: `Backend Engineer | Java, Go & Rust | LLM Enthusiast\n\nI build scalable backend systems and microservices...`,
  experience: [
    { title: "Software Engineer", company: "Hexaware", period: "03/2022 – 06/2025 | Chennai, India", bullets: ["Designed a POC to auto-generate BRDs from COBOL/DB2/IMS systems using Spring Web MVC.", "Integrated OpenAI API to automate business requirement content generation using FastAPI and LangChain.", "Built and maintained secure REST APIs with Spring Boot for financial services."] },
    { title: "Senior Software Engineer", company: "Capgemini", period: "06/2025 – Present | Chennai", bullets: ["Wrote unit tests and integration test cases for SDV / ADAS software components."] },
  ],
  openSource: [
    { title: "Added node:sqlite named params - Deno", link: "https://github.com/denoland/deno/pull/28154" },
    { title: "Contributions to Zed", link: null },
  ],
  projects: [
    { name: "Note Taker (Backend WIP)", period: "08/2025 – Present", desc: "Go + Spring Boot microservices, gRPC, PostgreSQL" },
    { name: "Url Shortener", desc: "Gin + Redis" },
    { name: "Screen Time Tracker", period: "09/2024 – present", desc: "Tauri + React frontend, Rust daemon, FastAPI + LangChain" },
    { name: "RLox", period: "01/2024 – present", desc: "Interpreter in Rust (WIP)" },
  ],
};

const LANGUAGES = ["Java", "Go", "Rust", "Python", "TypeScript", "C", "Zig", "Lua", "HTML/CSS", "C#", "SQL", "JavaScript"];
const DATABASES = ["Postgres", "MySQL", "SQLite"];
const FRAMEWORKS = ["Spring Boot", "Gin", "gRPC", "FastAPI", "React", "Deno", "Node", "Express", "Tokio", "GORM", "Hibernate", "RabbitMQ"];
const KNOWN_RATINGS = { Java: 8, Go: 7, Rust: 9, gRPC: 7, "Spring Boot": 8, Gin: 7, Postgres: 7, LLM: 6, Python: 7, TypeScript: 6, React: 7, FastAPI: 7 };

function rand(min, max) { return Math.random() * (max - min) + min; }

function hslToColor(h, s, l) { const color = new THREE.Color(); color.setHSL(((h % 360) / 360), s, l); return color; }

const glowCache = new Map();

function buildGlowTexture(color, innerAlpha = 0.9) {
  const key = color.getHexString() + ":" + innerAlpha;
  if (glowCache.has(key)) return glowCache.get(key);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const r = Math.round(color.r * 255), g = Math.round(color.g * 255), b = Math.round(color.b * 255);
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, `rgba(${r},${g},${b},${innerAlpha})`);
  grd.addColorStop(0.2, `rgba(${r},${g},${b},0.7)`);
  grd.addColorStop(0.6, `rgba(${r},${g},${b},0.28)`);
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  glowCache.set(key, tex);
  return tex;
}

function worldToScreen(vec3, camera, size) {
  const v = vec3.clone().project(camera);
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) ? window.devicePixelRatio : 1;
  const x = (v.x * 0.5 + 0.5) * size.width / dpr;
  const y = (-v.y * 0.5 + 0.5) * size.height / dpr;
  return { x, y };
}

function BackgroundStars() { return <ThreeStars radius={1400} depth={900} count={900} factor={6} saturation={0.22} fade />; }

function rating10To5(r10) { if (r10 == null) return null; return Math.round((r10 / 10) * 5 * 10) / 10; }

function ratingClass(r5) {
  if (r5 === null || r5 === undefined) return { cls: "Red Dwarf", color: new THREE.Color(1.0, 0.5, 0.5), sizeMul: 0.85 };
  if (r5 >= 4.6) return { cls: "Supergiant", color: new THREE.Color(1.0, 0.85, 0.42), sizeMul: 1.6 };
  if (r5 >= 3.6) return { cls: "Giant", color: new THREE.Color(0.95, 0.95, 0.6), sizeMul: 1.3 };
  if (r5 >= 2.6) return { cls: "Dwarf", color: new THREE.Color(0.92, 0.92, 1.0), sizeMul: 1.0 };
  if (r5 >= 1.6) return { cls: "Red Dwarf", color: new THREE.Color(1.0, 0.5, 0.5), sizeMul: 0.9 };
  return { cls: "Neutron", color: new THREE.Color(0.7, 0.95, 1.0), sizeMul: 0.7 };
}

function placePointsWithMinDistance(center, n, radiusBase, minDist) {
  const points = [];
  let attempts = 0;
  while (points.length < n && attempts < n * 400) {
    const ang = rand(0, Math.PI * 2);
    const r = radiusBase * (0.45 + Math.random() * 0.95);
    const x = center.x + Math.cos(ang) * r + rand(-0.8, 0.8);
    const y = center.y + rand(-1.6, 1.6);
    const z = center.z + Math.sin(ang) * r + rand(-0.8, 0.8);
    const cand = new THREE.Vector3(x, y, z);
    let ok = true;
    for (const p of points) {
      if (p.distanceTo(cand) < minDist) { ok = false; break; }
    }
    if (ok) points.push(cand);
    attempts++;
  }
  if (points.length < n) {
    points.length = 0;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const r = radiusBase;
      points.push(new THREE.Vector3(center.x + Math.cos(ang) * r, center.y, center.z + Math.sin(ang) * r));
    }
  }
  return points;
}

function StarMesh({ position, baseRadius = 1, hue = 200, label, constellationId = null, rating10 = null, onHover, onClick, tooltipEnabled = true, showLabels = true }) {
  const ref = useRef();
  const core = useRef();
  const hoverTimeout = useRef(null);
  const worldPos = useMemo(() => (position instanceof THREE.Vector3 ? position.clone() : new THREE.Vector3(position[0], position[1], position[2])), [position]);

  const rating5 = useMemo(() => rating10To5(rating10), [rating10]);
  const clsInfo = useMemo(() => ratingClass(rating5), [rating5]);
  const color = useMemo(() => clsInfo.color.clone().lerp(hslToColor(hue, 0.6, 0.48), 0.28), [clsInfo, hue]);
  const radius = baseRadius * (0.92 + 0.32 * clsInfo.sizeMul);

  const spriteTex = useMemo(() => buildGlowTexture(color, 0.9), [color]);
  const phase = useMemo(() => rand(0, Math.PI * 2), []);
  const pulseSpeed = useMemo(() => rand(0.85, 1.5), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (core.current && core.current.material) {
      core.current.material.emissive = color.clone().multiplyScalar(0.95);
      core.current.material.emissiveIntensity = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(t * pulseSpeed + phase));
    }
    if (ref.current) ref.current.rotation.y += 0.0007;
  });

  useEffect(() => () => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); }, []);

  const handleOver = (e) => {
    e.stopPropagation();
    if (!tooltipEnabled) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = window.setTimeout(() => {
      onHover && onHover({ label, position: worldPos, constellationId, rating5, cls: clsInfo.cls, color });
      hoverTimeout.current = null;
    }, 200);
  };
  const handleOut = (e) => {
    e.stopPropagation();
    if (!tooltipEnabled) return;
    if (hoverTimeout.current) { clearTimeout(hoverTimeout.current); hoverTimeout.current = null; }
    onHover && onHover(null);
  };
  const handleClick = (e) => {
    e.stopPropagation();
    onClick && onClick({ name: label, constellationId, rating5, worldPos: worldPos.clone() });
  };

  return (
    <group ref={ref} position={[worldPos.x, worldPos.y, worldPos.z]}>
      <mesh ref={core} frustumCulled={false} onPointerOver={handleOver} onPointerOut={handleOut} onClick={handleClick} castShadow receiveShadow>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshPhysicalMaterial color={color} metalness={0.08} roughness={0.34} emissive={color.clone().multiplyScalar(0.18)} emissiveIntensity={0.6} clearcoat={0.12} clearcoatRoughness={0.6} />
      </mesh>

      <sprite frustumCulled={false} scale={[radius * 6.0, radius * 6.0, 1]}>
        <spriteMaterial map={spriteTex} blending={THREE.AdditiveBlending} transparent depthWrite={false} opacity={0.92} toneMapped={false} />
      </sprite>

      {showLabels && (
        <Html position={[0, radius * 1.12, 0]} center occlude style={{ pointerEvents: "none" }}>
          <div style={{ color: "#fff", fontSize: 10, whiteSpace: "nowrap", textShadow: "0 1px 2px rgba(0,0,0,0.95)" }}>{label}</div>
        </Html>
      )}
    </group>
  );
}

function ConstellationLines({ points = [], color = 0xffffff }) {
  if (!points || points.length < 2) return null;
  const posArr = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    posArr[i * 3 + 0] = points[i].x;
    posArr[i * 3 + 1] = points[i].y;
    posArr[i * 3 + 2] = points[i].z;
  }
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attachObject={["attributes", "position"]} count={points.length} array={posArr} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.24} linewidth={1} />
    </line>
  );
}

function Planet({ orbitCenter = [0, 0, 0], orbitRadius = 10, angle = 0, speed = 0.0025, height = 0, radius = 1, color, data, onHover, tooltipEnabled = true }) {
  const ref = useRef();
  const a = useRef(angle);
  const hoverTimeout = useRef(null);

  useFrame((state, delta) => {
    a.current += speed * delta * 60;
    const x = orbitCenter[0] + orbitRadius * Math.cos(a.current);
    const z = orbitCenter[2] + orbitRadius * Math.sin(a.current);
    if (ref.current) {
      ref.current.position.set(x, height, z);
      ref.current.rotation.y += 0.004 * (0.6 + 0.8 * Math.sin(a.current * 0.8));
    }
  });

  useEffect(() => () => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); }, []);

  const handleOver = (e) => {
    e.stopPropagation();
    if (!tooltipEnabled) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const meta = { ...data, orbitRadius, angle: a.current, height };
    hoverTimeout.current = window.setTimeout(() => { onHover && onHover(meta); hoverTimeout.current = null; }, 200);
  };
  const handleOut = (e) => { e.stopPropagation(); if (!tooltipEnabled) return; if (hoverTimeout.current) { clearTimeout(hoverTimeout.current); hoverTimeout.current = null; } onHover && onHover(null); };

  return (
    <group>
      <mesh ref={ref} frustumCulled={false} onPointerOver={handleOver} onPointerOut={handleOut} onClick={() => data.url && window.open(data.url, "_blank")}>
        <sphereGeometry args={[radius, 28, 28]} />
        <meshStandardMaterial color={color} roughness={0.36} metalness={0.08} emissive={color.clone().multiplyScalar(0.16)} emissiveIntensity={0.45} />
      </mesh>
      <sprite frustumCulled={false} position={[0, 0, 0]} scale={[radius * 3.0, radius * 3.0, 1]}>
        <spriteMaterial map={buildGlowTexture(color, 0.66)} blending={THREE.AdditiveBlending} transparent depthWrite={false} opacity={0.9} />
      </sprite>
    </group>
  );
}

// --- ForceUpdateRender (keeps matrices & render up-to-date) ---
function ForceUpdateRender() {
  const { scene, gl, camera } = useThree();
  useFrame(() => {
    try { scene.updateMatrixWorld(true); } catch (e) { }
    try { gl.render(scene, camera); } catch (e) { }
  });
  return null;
}

function SceneController({ setPlanetHover, setStarHover, onStarClick, selectedStar, focusTarget, setFocusTarget, controlsRef, tooltipEnabled = true, showLabels = true, spacingBoost = 1.0, planetOrbitScale = 1.0 }) {
  const { camera, gl } = useThree();

  const centers = useMemo(() => ({
    topLeft: new THREE.Vector3(-140, 40, -80),
    topRight: new THREE.Vector3(140, 40, -80),
    bottomLeft: new THREE.Vector3(-140, -18, 120),
    bottomRight: new THREE.Vector3(140, -18, 120),
    github: new THREE.Vector3(0, 0, 0),
  }), []);

  const langRadius = 24 * spacingBoost;
  const dbRadius = 18 * spacingBoost;
  const fwRadius = 22 * spacingBoost;
  const expRadius = 16 * spacingBoost;
  const minDist = 4.6 * spacingBoost;

  const langPoints = useMemo(() => {
    const pts = placePointsWithMinDistance(centers.topLeft, LANGUAGES.length, langRadius, minDist);
    return LANGUAGES.map((name, i) => ({ name, pos: pts[i] }));
  }, [centers.topLeft, langRadius, minDist]);

  const dbPoints = useMemo(() => {
    const pts = placePointsWithMinDistance(centers.topRight, DATABASES.length, dbRadius, minDist);
    return DATABASES.map((name, i) => ({ name, pos: pts[i] }));
  }, [centers.topRight, dbRadius, minDist]);

  const fwPoints = useMemo(() => {
    const pts = placePointsWithMinDistance(centers.bottomRight, FRAMEWORKS.length, fwRadius, minDist);
    return FRAMEWORKS.map((name, i) => ({ name, pos: pts[i] }));
  }, [centers.bottomRight, fwRadius, minDist]);

  const expPoints = useMemo(() => {
    const titles = RESUME.experience.map((e) => `${e.title} @ ${e.company}`);
    const pts = placePointsWithMinDistance(centers.bottomLeft, titles.length, expRadius, minDist);
    return titles.map((name, i) => ({ name, pos: pts[i] }));
  }, [centers.bottomLeft, expRadius, minDist]);

  const planets = useMemo(() => [
    { orbitRadius: Math.max(36, 36 * planetOrbitScale), angle: 0.4, speed: 0.00018, radius: 0.44, color: hslToColor(210, 0.48, 0.44), projectName: "Note Taker", desc: "Note-taking backend" },
    { orbitRadius: Math.max(48, 48 * planetOrbitScale), angle: 1.8, speed: 0.00022, radius: 0.5, color: hslToColor(280, 0.48, 0.44), projectName: "URL Shortener", desc: "Gin + Redis" },
    { orbitRadius: Math.max(60, 60 * planetOrbitScale), angle: -0.9, speed: 0.00017, radius: 0.38, color: hslToColor(120, 0.48, 0.44), projectName: "Screen Time Tracker", desc: "Tauri + Rust daemon" },
  ], [planetOrbitScale]);

  function projToScreen(vec3) {
    const width = gl && gl.domElement ? (gl.domElement.width || gl.domElement.clientWidth || window.innerWidth) : window.innerWidth;
    const height = gl && gl.domElement ? (gl.domElement.height || gl.domElement.clientHeight || window.innerHeight) : window.innerHeight;
    return worldToScreen(vec3, camera, { width, height });
  }

  const selectedWorldPos = useMemo(() => {
    if (!selectedStar) return null;
    const { name, constellationId } = selectedStar;
    if (constellationId === "github") return centers.github.clone();
    const clusters = { languages: langPoints, databases: dbPoints, frameworks: fwPoints, experience: expPoints };
    const arr = clusters[constellationId];
    if (!arr) return null;
    const found = arr.find(p => p.name === name);
    return found ? found.pos.clone() : null;
  }, [selectedStar, langPoints, dbPoints, fwPoints, expPoints, centers.github]);

  function SelectedPulse({ pos }) {
    const matRef = useRef();
    useFrame((state) => {
      const t = state.clock.getElapsedTime();
      if (!matRef.current || !pos) return;
      matRef.current.scale.setScalar(1 + 0.12 * Math.sin(t * 2.8));
      matRef.current.opacity = 0.45 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.8));
    });
    if (!pos) return null;
    return (
      <mesh position={[pos.x, pos.y, pos.z]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2.8, 64]} />
        <meshBasicMaterial ref={matRef} color={0xffe1a8} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    );
  }

  function renderCluster(clusterId, clusterLabel, points, hue, centerPos) {
    return (
      <group key={clusterId}>
        <ConstellationLines points={points.map(p => p.pos)} color={hslToColor(hue, 0.55, 0.66).getHex()} />
        {showLabels && (
          <Html position={[centerPos.x, centerPos.y + 6.2, centerPos.z]} center occlude style={{ pointerEvents: "none" }}>
            <div style={{ padding: "8px 14px", borderRadius: 10, background: "linear-gradient(180deg, rgba(14,16,20,0.92), rgba(8,10,12,0.85))", color: "#cfe6ff", fontWeight: 800, letterSpacing: 0.3 }}>{clusterLabel}</div>
          </Html>
        )}
        {points.map((p, i) => {
          const r10 = KNOWN_RATINGS[p.name] ?? null;
          const big = ["Java", "Go", "Rust"].includes(p.name) ? 1.55 : 1.2;
          return (
            <StarMesh
              key={`${clusterId}-${i}`}
              position={[p.pos.x, p.pos.y, p.pos.z]}
              baseRadius={big}
              hue={hue + (i * 8)}
              label={p.name}
              constellationId={clusterId}
              rating10={r10}
              tooltipEnabled={tooltipEnabled}
              showLabels={false}
              onHover={(meta) => {
                if (!meta) return setStarHover(null);
                const scr = projToScreen(meta.position);
                setStarHover({ name: meta.label, screenX: scr.x, screenY: scr.y, color: meta.color, constellationId: meta.constellationId, rating5: meta.rating5, cls: meta.cls });
              }}
              onClick={({ name, constellationId, rating5, worldPos }) => {
                onStarClick && onStarClick({ name, constellationId, rating5, worldPos: worldPos.clone() });
                setFocusTarget && setFocusTarget(worldPos.clone());
              }}
            />
          );
        })}
      </group>
    );
  }

  return (
    <group>
      <BackgroundStars />

      {renderCluster("languages", "Languages", langPoints, 250, centers.topLeft)}
      {renderCluster("databases", "Databases", dbPoints, 40, centers.topRight)}
      {renderCluster("frameworks", "Frameworks", fwPoints, 28, centers.bottomRight)}
      {renderCluster("experience", "Experience", expPoints, 160, centers.bottomLeft)}

      {showLabels && (
        <Html position={[centers.github.x, centers.github.y + 6.2, centers.github.z]} center occlude style={{ pointerEvents: "none" }}>
          <div style={{ padding: "8px 14px", borderRadius: 10, background: "linear-gradient(180deg,#1b1f24,#0f1113)", color: "#ffd68a", fontWeight: 800 }}>GitHub</div>
        </Html>
      )}

      <StarMesh
        position={[centers.github.x, centers.github.y, centers.github.z]}
        baseRadius={2.6}
        hue={38}
        label={"GitHub"}
        constellationId={"github"}
        rating10={null}
        tooltipEnabled={tooltipEnabled}
        showLabels={false}
        onHover={(meta) => {
          if (!meta) return setStarHover(null);
          const s = projToScreen(meta.position);
          setStarHover({ name: meta.label, screenX: s.x, screenY: s.y, color: meta.color, constellationId: meta.constellationId });
        }}
        onClick={() => {
          try { window.open(RESUME.contact.githubUrl || `https://github.com/${RESUME.contact.github}`, "_blank"); } catch (e) { }
        }}
      />

      <SelectedPulse pos={selectedWorldPos} />

      {planets.map((pl, i) => (
        <Planet key={`planet-${i}`} orbitCenter={[centers.github.x, centers.github.y, centers.github.z]} orbitRadius={pl.orbitRadius} angle={pl.angle} speed={pl.speed} height={(i % 2) * 0.9} radius={pl.radius} color={pl.color} data={pl} onHover={(data) => {
          if (!data) return setPlanetHover(null);
          const worldPos = new THREE.Vector3(centers.github.x + data.orbitRadius * Math.cos(data.angle), data.height, centers.github.z + data.orbitRadius * Math.sin(data.angle));
          const scr = projToScreen(worldPos);
          setPlanetHover({ ...data, screenX: scr.x, screenY: scr.y });
        }} tooltipEnabled={tooltipEnabled} />
      ))}

      {/* lights */}
      <pointLight position={[0, 16, 48]} intensity={0.18} distance={420} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[80, 100, 160]} intensity={0.9} />
      <directionalLight position={[-40, -20, -80]} intensity={0.22} />
    </group>
  );
}

// -------- App (root) with camera animator fixes & Home button --------
export default function App() {
  const [sceneKey, setSceneKey] = useState(0);
  const [planetHover, setPlanetHover] = useState(null);
  const [starHover, setStarHover] = useState(null);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [selectedStar, setSelectedStar] = useState(null);
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  // camera / UI
  const [focusTarget, setFocusTarget] = useState(null);
  const [centerOnSelection, setCenterOnSelection] = useState(true);
  const [cameraLocked, setCameraLocked] = useState(false);
  const [tooltipEnabled, setTooltipEnabled] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [spacingBoost, setSpacingBoost] = useState(1.0);
  const [planetOrbitScale, setPlanetOrbitScale] = useState(1.0);

  // refs
  const aboutRef = useRef(null);
  const languagesRef = useRef(null);
  const databasesRef = useRef(null);
  const frameworksRef = useRef(null);
  const experienceRef = useRef(null);
  const controlsRef = useRef();

  // HOME camera settings (overview)
  const HOME_POS = useMemo(() => new THREE.Vector3(0, 80, 520), []);
  const HOME_TARGET = useMemo(() => new THREE.Vector3(0, 8, 0), []);

  useEffect(() => {
    function onKey(e) {
      if (e.key.toLowerCase() === "b") setAboutVisible(v => !v);
      if (e.key === "Escape") { setFocusTarget(null); setCameraLocked(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!aboutVisible) return;

    // 1) Nudge camera/controls so three internals recalc
    const c = controlsRef.current;
    try {
      if (c && c.object) {
        c.object.position.add(new THREE.Vector3(0.0001, 0, 0));
        if (typeof c.update === "function") c.update();
        c.object.position.sub(new THREE.Vector3(0.0001, 0, 0));
        if (typeof c.update === "function") c.update();
      }
    } catch (err) {
      // noop if controls not ready yet
    }

    // 2) Trigger a window resize event so Canvas/renderer re-layouts textures & DPR handling
    window.dispatchEvent(new Event("resize"));

    // NOTE: removed remounting via setSceneKey to avoid remount/thrash while camera/control state changes.
    // If you need to refresh visuals, call setSceneKey once manually in dev only.
  }, [aboutVisible]);

  useEffect(() => {
    let prev = false;
    const THRESH = 160; // px difference heuristic

    function checkDevTools() {
      const open = (window.outerWidth - window.innerWidth > THRESH) || (window.outerHeight - window.innerHeight > THRESH);
      if (open !== prev) {
        prev = open;
        setDevtoolsOpen(open);
        if (open) {
          console.log(
            "%c✨ this whole thing is vibe coded so even I dont know what kind of magic is this ✨",
            "font-size:14px; color:#ffd54f; font-weight:700; text-shadow: 0 1px 0 #000;"
          );
          console.log("%c(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧ enjoy the chaos", "font-size:12px; color:#cfe6ff");
        } else {
          console.log("%cBack to order (well… sorta) 😅", "font-size:12px; color:#9fd");
        }
      }
    }

    window.addEventListener("resize", checkDevTools);
    const id = window.setInterval(checkDevTools, 500);
    checkDevTools();

    return () => {
      window.removeEventListener("resize", checkDevTools);
      window.clearInterval(id);
    };
  }, []);

  function handleStarClick(payload) {
    console.log("star clicked -> payload:", payload);
    if (!payload) return;
    setSelectedStar(payload);

    if (centerOnSelection && payload.worldPos) {
      console.log("setting focus target to:", payload.worldPos);
      setFocusTarget(payload.worldPos.clone());
      // do not auto-lock camera here
    }

    setAboutVisible(true);

    setTimeout(() => {
      const id = (payload.constellationId || "").toLowerCase();
      const map = { languages: languagesRef, databases: databasesRef, frameworks: frameworksRef, experience: experienceRef, github: aboutRef };
      const ref = map[id];
      if (ref && ref.current) {
        ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (aboutRef && aboutRef.current) {
        aboutRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 140);
  }

  function getDescriptionFor(name, constellationId) {
    if (!name) return "";
    const lower = name.toLowerCase();
    if (constellationId === "languages") {
      if (["java", "go", "rust"].includes(lower)) return `${name} — core backend / systems language with strong experience.`;
      return `${name} — programming language.`;
    }
    if (constellationId === "databases") return `${name} — database technology used in projects.`;
    if (constellationId === "frameworks") return `${name} — framework / tool used in projects.`;
    if (constellationId === "experience") return `${name} — work experience item.`;
    if (constellationId === "github") return `Visit my GitHub: ${RESUME.contact.githubUrl}`;
    return `${name} — item.`;
  }

  function ratingText(name, constellationId, payloadRating) {
    const r5 = payloadRating != null ? payloadRating : (KNOWN_RATINGS[name] != null ? rating10To5(KNOWN_RATINGS[name]) : null);
    if (r5 == null) return null;
    return `${r5} / 5 — ${ratingClass(r5).cls}`;
  }

  // Camera animator: explicit render version
  function CameraAnimator() {
    const camera = useThree((s) => s.camera);
    const controls = useThree((s) => s.controls);
    const gl = useThree((s) => s.gl);
    const scene = useThree((s) => s.scene);

    useFrame((state, delta) => {
      if (!controls) return;

      try {
        controls.enabled = true;

        if (focusTarget) {
          const curDist = camera.position.distanceTo(focusTarget);
          const back = Math.max(36, curDist * 0.75);
          const dir = camera.position.clone().sub(focusTarget).normalize();
          if (dir.length() < 0.0001) dir.set(0, 0.2, 1).normalize();
          const desired = focusTarget.clone().add(dir.multiplyScalar(back));
          if (desired.distanceTo(camera.position) < 0.001) desired.add(new THREE.Vector3(0.0001, 0.0001, 0.0001));
          camera.position.lerp(desired, Math.min(1, delta * 3.0));

          const curT = controls.target.clone();
          curT.lerp(focusTarget, Math.min(1, delta * 3.0));
          controls.target.copy(curT);

          if (cameraLocked) {
            controls.enablePan = false;
            controls.enableRotate = false;
            controls.enableZoom = true;
            controls.enableKeys = false;
          } else {
            controls.enablePan = true;
            controls.enableRotate = true;
            controls.enableZoom = true;
            controls.enableKeys = true;
          }
        } else {
          controls.enablePan = true;
          controls.enableRotate = true;
          controls.enableZoom = true;
          controls.enableKeys = true;
        }

        // Update matrices and controls internals
        try { camera.updateMatrixWorld(); } catch (err) { }
        try { controls.update(); } catch (err) { }

        // EXPLICIT RENDER — guarantees the canvas matches the camera state this frame
        try { gl.render(scene, camera); } catch (err) { /* swallow */ }
      } catch (err) {
        // defensive
      }
    });

    return null;
  }

  function goHome() {
    setFocusTarget(null);
    setCameraLocked(false);
    const controls = controlsRef.current;
    if (!controls) return;
    const cam = controls.object;
    if (cam && cam.position) {
      try {
        cam.position.copy(HOME_POS.clone());
        controls.target.copy(HOME_TARGET.clone());
        controls.update();
      } catch (err) { /* swallow */ }
    }
  }

  function uncenter() {
    setFocusTarget(null);
    setCameraLocked(false);
  }

  function toggleExtraSpacing() {
    setSpacingBoost(s => (s > 1.01 ? 1.0 : 1.45));
  }

  function KeepRendering() {
    useFrame(() => {
      // no-op; forces continuous rendering every frame
    });
    return null;
  }

  // ensure controls target is initialized to HOME_TARGET when controls become available
  useEffect(() => {
    const c = controlsRef.current;
    if (c && c.target && HOME_TARGET) {
      try {
        c.target.set(HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z);
        if (typeof c.update === "function") c.update();
      } catch (err) { }
    }
  }, [HOME_TARGET]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "radial-gradient(ellipse at center, #000814 0%, #000 72%)", pointerEvents: "none" }}>
      {/* Canvas MUST receive pointer events: override via style */}
      <Canvas frameloop="always" style={{ pointerEvents: "auto" }} shadows camera={{ position: [HOME_POS.x, HOME_POS.y, HOME_POS.z], fov: 55 }}>
        <color attach="background" args={[0x000000]} />
        <SceneController
          key={sceneKey}
          setPlanetHover={setPlanetHover}
          setStarHover={setStarHover}
          onStarClick={handleStarClick}
          selectedStar={selectedStar}
          focusTarget={focusTarget}
          setFocusTarget={setFocusTarget}
          controlsRef={controlsRef}
          tooltipEnabled={tooltipEnabled}
          showLabels={showLabels}
          spacingBoost={spacingBoost}
          planetOrbitScale={planetOrbitScale}
        />

        {/* Make controls the default registered controls in r3f state */}
        <OrbitControls
          makeDefault
          ref={controlsRef}
          enablePan
          enableRotate
          enableZoom
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={0.05}
          maxPolarAngle={Math.PI / 1.4}
          minDistance={6}
          maxDistance={5000}
          autoRotate={false}
        />

        <CameraAnimator />
        <KeepRendering />
        <ForceUpdateRender />
      </Canvas>

      {/* 👇 Funny DevTools overlay */}
      {devtoolsOpen && (
        <div
          style={{
            position: "fixed",
            left: 20,
            bottom: 20,
            zIndex: 99999,
            pointerEvents: "none",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.7), rgba(8,10,12,0.85))",
            color: "#ffd",
            padding: "10px 14px",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            fontWeight: 700,
            fontSize: 14,
            opacity: 0.98,
            fontFamily: "monospace",
          }}
        >
        this whole thing is vibe coded so even I dont know what kind of magic
        is this **sighs** gotta learn graphics programming and frontend 
        </div>
      )}


      {/* header */}
      <div style={{ position: "absolute", left: 18, top: 12, pointerEvents: "auto" }}>
        <h1 style={{ color: "#FFD54F", margin: 0, fontSize: 34 }}>{RESUME.name}</h1>
        <div style={{ color: "#ddd", fontSize: 13, marginTop: 6 }}>{RESUME.summary.split("\n")[0]}</div>
        <div style={{ color: "#bbb", fontSize: 12, marginTop: 6 }}>Click star → About & focus • Hover (200ms) shows rating & class • Esc to release</div>
      </div>

      {/* controls top-right (added Home) */}
      <div style={{ position: "absolute", right: 18, top: 18, display: "flex", gap: 8, alignItems: "center", pointerEvents: "auto" }}>
        <button onClick={() => setAboutVisible(v => !v)} style={{ background: "linear-gradient(180deg,#111318,#0c0e11)", color: "#9cc4ff", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>{aboutVisible ? "Hide About" : "About"}</button>

        <button onClick={() => setTooltipEnabled(s => !s)} style={{ background: tooltipEnabled ? "#073046" : "#30110c", color: "#cfe6ff", padding: "10px 12px", borderRadius: 10 }}>{tooltipEnabled ? "Tooltips: ON" : "Tooltips: OFF"}</button>

        <button onClick={() => { setShowLabels(s => !s); }} style={{ background: showLabels ? "#124" : "#3a1222", color: "#cfe6ff", padding: "10px 12px", borderRadius: 10 }}>{showLabels ? "Labels: ON" : "Labels: OFF"}</button>

        <button onClick={() => toggleExtraSpacing()} style={{ background: spacingBoost > 1.01 ? "#144020" : "#2b2b2b", color: "#cfe6ff", padding: "10px 12px", borderRadius: 10 }}>{spacingBoost > 1.01 ? "Spacing: EXTRA" : "Spacing: Normal"}</button>

        <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "8px 10px", borderRadius: 10 }}>
          <div style={{ color: "#cfe6ff", fontWeight: 700 }}>Orbit</div>
          <input type="range" min="0.5" max="1.8" step="0.05" value={planetOrbitScale} onChange={(e) => setPlanetOrbitScale(parseFloat(e.target.value))} />
        </div>

        <button onClick={() => { setCenterOnSelection(s => !s); }} style={{ background: centerOnSelection ? "#114022" : "#3a1a22", color: "#cfe6ff", padding: "10px 12px", borderRadius: 10 }}>{centerOnSelection ? "Auto-Center: ON" : "Auto-Center: OFF"}</button>

        <button onClick={() => { setFocusTarget(null); setCameraLocked(false); }} style={{ background: "#2b2b2b", color: "#ffd", padding: "10px 12px", borderRadius: 10 }}>Uncenter</button>

        <button onClick={() => goHome()} style={{ background: "#0c2230", color: "#9fd", padding: "10px 12px", borderRadius: 10 }}>Home</button>
      </div>

      {/* star tooltip */}
      {starHover && !aboutVisible && tooltipEnabled && (
        <div style={{ position: "absolute", left: Math.min(window.innerWidth - 16 - 420, Math.max(8, starHover.screenX + 18)), top: Math.min(window.innerHeight - 16 - 260, Math.max(8, starHover.screenY + 6)), pointerEvents: "auto" }}>
          <div style={{ width: 380, background: "linear-gradient(180deg,#0b0d10,#070809)", borderRadius: 12, padding: 12, color: "#eaeaea", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: starHover.color ? `#${(starHover.color instanceof THREE.Color ? starHover.color.getHexString() : new THREE.Color(starHover.color).getHexString())}` : "#fff", boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{starHover.name}</div>
                <div style={{ fontSize: 12, color: "#9aa" }}>{starHover.constellationId ? `Constellation: ${starHover.constellationId}` : ""}</div>
              </div>
              {starHover.rating5 != null ? <div style={{ color: "#ffd", fontWeight: 800 }}>{starHover.rating5} / 5</div> : <div style={{ color: "#ffb", fontWeight: 700 }}>Red Dwarf</div>}
            </div>
            {starHover.rating5 !== undefined && starHover.rating5 !== null ? (
              <div style={{ marginTop: 8, color: "#cfe6ff", fontWeight: 600 }}>{`${starHover.cls}`}</div>
            ) : (
              <div style={{ marginTop: 8, color: "#f7b", fontWeight: 600 }}>Red Dwarf (no rating available)</div>
            )}
          </div>
        </div>
      )}

      {/* planet tooltip */}
      {planetHover && !aboutVisible && tooltipEnabled && (
        <div style={{ position: "absolute", left: Math.min(window.innerWidth - 16 - 380, Math.max(8, planetHover.screenX + 18)), top: Math.min(window.innerHeight - 16 - 220, Math.max(8, planetHover.screenY + 6)), pointerEvents: "auto" }}>
          <div style={{ width: 360, background: "linear-gradient(180deg,#0b0d10,#070809)", borderRadius: 12, padding: 12, color: "#eaeaea" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#89c5ff" }}>{planetHover.projectName}</div>
            <div style={{ marginTop: 6 }}>{planetHover.desc}</div>
          </div>
        </div>
      )}

      {/* About panel */}
      {aboutVisible && (
        <div style={{ position: "absolute", right: 18, top: 60, width: 560, pointerEvents: "auto" }}>
          <div style={{ background: "linear-gradient(180deg, rgba(8,10,12,0.98), rgba(6,7,9,0.98))", borderRadius: 12, padding: 18, color: "#eaeaea", maxHeight: "78vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            <h2 style={{ color: "#FFD54F", marginTop: 0 }}>{RESUME.name}</h2>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <div style={{ flex: 1, color: "#cfe6ff" }}>{selectedStar ? `Selected: ${selectedStar.name} (${selectedStar.constellationId})` : "No selection"}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setCenterOnSelection((s) => !s)} style={{ padding: "8px 10px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.04)", color: "#9cc4ff" }}>{centerOnSelection ? "Auto-Center: ON" : "Auto-Center: OFF"}</button>
                <button onClick={() => setCameraLocked(l => !l)} style={{ padding: "8px 10px", borderRadius: 8, background: cameraLocked ? "#422" : "#224", color: "#ffd" }}>{cameraLocked ? "Camera Locked" : "Lock Camera"}</button>
                <button onClick={() => { setFocusTarget(null); setCameraLocked(false); }} style={{ padding: "8px 10px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.04)", color: "#9cc4ff" }}>Uncenter</button>
              </div>
            </div>

            {selectedStar ? (
              <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "linear-gradient(180deg, rgba(20,22,24,0.6), rgba(8,10,12,0.6))" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, background: "#07121a", display: "flex", alignItems: "center", justifyContent: "center", color: "#9fd", fontWeight: 800, fontSize: 22 }}>{selectedStar.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{selectedStar.name}</div>
                    <div style={{ fontSize: 13, color: "#9aa" }}>{selectedStar.constellationId ? `Category: ${selectedStar.constellationId}` : ""}</div>
                  </div>
                  <div>
                    <button onClick={() => setSelectedStar(null)} style={{ background: "transparent", color: "#9aa", border: "1px solid rgba(255,255,255,0.04)", padding: "6px 10px", borderRadius: 8 }}>Clear</button>
                  </div>
                </div>
                <div style={{ marginTop: 10, color: "#cfe6ff", fontWeight: 600 }}>{getDescriptionFor(selectedStar.name, selectedStar.constellationId)}</div>
                <div style={{ marginTop: 8, color: "#ffd", fontWeight: 800 }}>{ratingText(selectedStar.name, selectedStar.constellationId, selectedStar.rating5) || "Red Dwarf (no rating available)"}</div>
              </div>
            ) : null}

            <div ref={aboutRef}>
              <p style={{ whiteSpace: "pre-line", marginBottom: 8 }}>{RESUME.summary}</p>
              <div style={{ fontSize: 13 }}><strong>Contact:</strong> <a href={RESUME.contact.githubUrl} target="_blank" rel="noreferrer" style={{ color: "#9cc4ff" }}>{RESUME.contact.githubUrl}</a> • {RESUME.contact.email} • {RESUME.contact.phone}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 15 }}>Languages</strong>
              <div style={{ marginTop: 8, color: "#cfe6ff", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {LANGUAGES.map((l) => {
                  const selected = selectedStar && selectedStar.name === l && selectedStar.constellationId === "languages";
                  return (
                    <div key={l} style={{ padding: "6px 10px", borderRadius: 8, background: selected ? "linear-gradient(180deg,#1b2b36,#0b1620)" : "transparent", fontWeight: selected ? 800 : 600, color: selected ? "#fffbda" : "#cfe6ff" }}>{l}</div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 15 }}>Databases</strong>
              <div style={{ marginTop: 8, color: "#cfe6ff", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DATABASES.map((d) => {
                  const selected = selectedStar && selectedStar.name === d && selectedStar.constellationId === "databases";
                  return <div key={d} style={{ padding: "6px 10px", borderRadius: 8, background: selected ? "linear-gradient(180deg,#1b2b36,#0b1620)" : "transparent", fontWeight: selected ? 800 : 600, color: selected ? "#fffbda" : "#cfe6ff" }}>{d}</div>;
                })}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 15 }}>Frameworks & Tools</strong>
              <div style={{ marginTop: 8, color: "#cfe6ff", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {FRAMEWORKS.map((f) => {
                  const selected = selectedStar && selectedStar.name === f && selectedStar.constellationId === "frameworks";
                  return <div key={f} style={{ padding: "6px 10px", borderRadius: 8, background: selected ? "linear-gradient(180deg,#1b2b36,#0b1620)" : "transparent", fontWeight: selected ? 800 : 600, color: selected ? "#fffbda" : "#cfe6ff" }}>{f}</div>;
                })}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 15 }}>Open Source Contributions</strong>
              <div style={{ marginTop: 8, color: "#cfe6ff" }}>
                {RESUME.openSource.map((os, i) => (
                  <div key={i} style={{ marginTop: 6 }}>
                    {os.link ? <a href={os.link} target="_blank" rel="noreferrer" style={{ color: "#9fd" }}>{os.title}</a> : <span>{os.title}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 15 }}>Experience</strong>
              <div style={{ marginTop: 8, color: "#cfe6ff" }}>
                {RESUME.experience.map((e, i) => {
                  const label = `${e.title} @ ${e.company}`;
                  const selected = selectedStar && selectedStar.name === label && selectedStar.constellationId === "experience";
                  return (
                    <div key={i} style={{ marginTop: 8, padding: selected ? "8px" : 0, borderRadius: 8, background: selected ? "rgba(28,38,44,0.35)" : "transparent" }}>
                      <div style={{ fontWeight: 800 }}>{e.title} — {e.company} <span style={{ color: "#9aa", fontWeight: 400 }}> {e.period}</span></div>
                      <ul style={{ marginTop: 6 }}>{e.bullets.map((b, j) => <li key={j} style={{ fontSize: 13 }}>{b}</li>)}</ul>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
