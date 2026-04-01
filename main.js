// Простая не модульная версия для запуска без сборщика
(function(){
  const canvas = document.getElementById('gameCanvas');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f14);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 2000);
  camera.position.set(0, 6, 12);

  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  window.addEventListener('resize', ()=> {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0,1.2,0);
  controls.update();

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(5,10,7);
  dir.castShadow = true;
  scene.add(dir);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40,40),
    new THREE.MeshStandardMaterial({color:0x0f1720})
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(6,0.6,2.2),
    new THREE.MeshStandardMaterial({color:0x1b2430})
  );
  table.position.set(0,0.3,0);
  table.receiveShadow = true;
  table.castShadow = true;
  scene.add(table);

  const patient = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.8,0.9), new THREE.MeshStandardMaterial({color:0xffd6c2}));
  torso.position.set(0,1.0,0);
  patient.add(torso);
  scene.add(patient);

  const surgeon = new window.Surgeon(scene, camera, renderer.domElement, patient);
  const ui = new window.UI(surgeon);

  let last = performance.now();
  function animate(t){
    const dt = (t - last)/1000;
    last = t;
    surgeon.update(dt);
    ui.update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  window.surgeon = surgeon;
})();