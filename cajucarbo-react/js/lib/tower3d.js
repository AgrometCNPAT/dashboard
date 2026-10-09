/* =========================================================
   tower3d.js
   Torre agrometeorológica em 3D real (Three.js).
   Carregada somente quando a seção "Torres de Campo" está ativa.
   ========================================================= */

const CC_TOWER_STATUS_COLOR = {
  "operacional": 0x2E8B57,
  "atencao": 0xC98A1F,
  "sem-comunicacao": 0xB3372C,
};

/**
 * createTowerScene(container, statusKey)
 * Monta a cena, inicia o loop de animação e retorna um handle com
 * update(statusKey) e dispose() para controle de ciclo de vida em React.
 */
function createTowerScene(container, statusKey){
  const width = container.clientWidth || 320;
  const height = container.clientHeight || 360;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, width/height, 0.1, 100);
  camera.position.set(6.2, 3.6, 8.2);
  camera.lookAt(0, 2.2, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
  controls.minPolarAngle = Math.PI/3.2;
  controls.maxPolarAngle = Math.PI/2.05;

  // ---- Luzes ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(5, 8, 4);
  scene.add(key);
  const rim = new THREE.PointLight(0x1A5DA6, 0.6, 20);
  rim.position.set(-4, 4, -3);
  scene.add(rim);

  const towerGroup = new THREE.Group();
  scene.add(towerGroup);

  // ---- Base ----
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.3, 0.25, 24),
    new THREE.MeshStandardMaterial({ color: 0x1a1f29, roughness: 0.85 })
  );
  base.position.y = 0.125;
  towerGroup.add(base);

  // ---- Mastro central ----
  const mastHeight = 5.2;
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, mastHeight, 10),
    new THREE.MeshStandardMaterial({ color: 0x3D4552, metalness: 0.4, roughness: 0.5 })
  );
  mast.position.y = mastHeight/2 + 0.25;
  towerGroup.add(mast);

  // ---- Treliça (4 hastes diagonais leves) ----
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x5B6472, metalness: 0.3, roughness: 0.6 });
  for(let i=0;i<4;i++){
    const angle = (i/4) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, mastHeight*0.86, 6), trussMat);
    leg.position.set(Math.cos(angle)*0.42, mastHeight*0.43 + 0.25, Math.sin(angle)*0.42);
    leg.rotation.x = Math.sin(angle) * 0.05;
    leg.rotation.z = Math.cos(angle) * 0.05;
    towerGroup.add(leg);
  }

  // ---- Módulos de sensores (com pulso) ----
  const sensorPositions = [1.6, 2.9, 4.1];
  const pulses = [];
  sensorPositions.forEach((h, i) => {
    const modGroup = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x1A5DA6, metalness: 0.3, roughness: 0.4 })
    );
    modGroup.add(box);

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      new THREE.MeshStandardMaterial({ color: CC_TOWER_STATUS_COLOR[statusKey] || 0x98A1AE, emissive: CC_TOWER_STATUS_COLOR[statusKey] || 0x000000, emissiveIntensity: 1.2 })
    );
    dot.position.set(0.2, 0, 0.11);
    modGroup.add(dot);

    const pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.075, 24),
      new THREE.MeshBasicMaterial({ color: CC_TOWER_STATUS_COLOR[statusKey] || 0x98A1AE, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    pulseRing.position.set(0.2, 0, 0.111);
    modGroup.add(pulseRing);

    modGroup.position.set(0.16, h, 0.05);
    modGroup.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.5;
    towerGroup.add(modGroup);
    pulses.push({ ring: pulseRing, dot, offset: i * 0.7 });
  });

  // ---- Anemômetro no topo ----
  const anemGroup = new THREE.Group();
  const anemCore = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), new THREE.MeshStandardMaterial({ color: 0x98A1AE }));
  anemGroup.add(anemCore);
  for(let i=0;i<3;i++){
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.5,6), new THREE.MeshStandardMaterial({ color: 0x98A1AE }));
    arm.position.y = 0.25;
    arm.rotation.z = Math.PI/2;
    const pivot = new THREE.Group();
    pivot.rotation.y = (i/3) * Math.PI * 2;
    pivot.add(arm);
    anemGroup.add(pivot);
  }
  anemGroup.position.y = mastHeight + 0.28;
  towerGroup.add(anemGroup);

  // ---- Sensor de solo ----
  const soilRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.4,6), new THREE.MeshStandardMaterial({color:0x5B6472}));
  soilRod.position.set(0.5, -0.05, 0);
  const soilTip = new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8), new THREE.MeshStandardMaterial({color:0xC98A1F, emissive:0xC98A1F, emissiveIntensity:0.4}));
  soilTip.position.set(0.5, -0.22, 0);
  towerGroup.add(soilRod, soilTip);

  // ---- Nó "plataforma" (destino dos feixes de dados) ----
  const platform = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshStandardMaterial({ color: 0x001B3D, emissive: 0x013B7A, emissiveIntensity: 0.6, metalness: 0.5, roughness: 0.3 })
  );
  platform.position.set(3.4, 2.6, -1.8);
  scene.add(platform);

  // ---- Partículas de transmissão de dados (torre -> plataforma) ----
  const beamParticles = [];
  const beamGeo = new THREE.SphereGeometry(0.035, 8, 8);
  sensorPositions.forEach((h, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0x2E8B57 });
    const p = new THREE.Mesh(beamGeo, mat);
    scene.add(p);
    beamParticles.push({
      mesh: p,
      from: new THREE.Vector3(0.2, h, 0.05),
      to: platform.position.clone(),
      t: i * 0.3,
      speed: 0.22
    });
  });

  // ---- Chão discreto (grade sutil) ----
  const grid = new THREE.GridHelper(14, 14, 0x1A5DA6, 0x1A2333);
  grid.position.y = 0;
  grid.material.opacity = 0.12;
  grid.material.transparent = true;
  scene.add(grid);

  let raf;
  const clock = new THREE.Clock();

  function animate(){
    const t = clock.getElapsedTime();

    pulses.forEach(p => {
      const local = (t*0.9 + p.offset) % 1.6;
      const scale = 1 + local*3.2;
      p.ring.scale.set(scale, scale, scale);
      p.ring.material.opacity = Math.max(0, 0.8 - local*0.6);
    });

    beamParticles.forEach(p => {
      p.t += 0.01 * p.speed * 60 / 60;
      const progress = (p.t % 1);
      p.mesh.position.lerpVectors(p.from, p.to, progress);
      p.mesh.material.opacity = 1 - Math.abs(progress-0.5)*1.2;
      p.mesh.material.transparent = true;
    });

    anemGroup.rotation.y += 0.03;
    platform.rotation.y += 0.006;
    platform.rotation.x += 0.003;

    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  animate();

  function handleResize(){
    const w = container.clientWidth, h = container.clientHeight;
    if(!w || !h) return;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", handleResize);

  function updateStatus(newStatusKey){
    const color = CC_TOWER_STATUS_COLOR[newStatusKey] || 0x98A1AE;
    pulses.forEach(p => {
      p.dot.material.color.setHex(color);
      p.dot.material.emissive.setHex(color);
      p.ring.material.color.setHex(color);
    });
  }

  function dispose(){
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", handleResize);
    controls.dispose();
    scene.traverse(obj => {
      if(obj.geometry) obj.geometry.dispose();
      if(obj.material){
        if(Array.isArray(obj.material)) obj.material.forEach(m=>m.dispose());
        else obj.material.dispose();
      }
    });
    renderer.dispose();
    if(container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  }

  return { updateStatus, dispose };
}

window.CajuCarbo = window.CajuCarbo || {};
window.CajuCarbo.createTowerScene = createTowerScene;
