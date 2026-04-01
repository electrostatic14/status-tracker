(function(){
  class Surgeon {
    constructor(scene, camera, dom, patient){
      this.scene = scene;
      this.camera = camera;
      this.dom = dom;
      this.patient = patient;

      this.tool = 'scalpel';
      this.isCutting = false;
      this.blood = 100;
      this.heart = 100;
      this.stress = 0;

      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();

      this._createToolMesh();
      this._bindEvents();
      this.wounds = [];
    }

    _createToolMesh(){
      const geom = new THREE.CylinderGeometry(0.03,0.03,1.2,12);
      const mat = new THREE.MeshStandardMaterial({color:0x9aa7b2});
      this.toolMesh = new THREE.Mesh(geom, mat);
      this.toolMesh.rotation.z = Math.PI/2;
      this.toolMesh.castShadow = true;
      this.scene.add(this.toolMesh);
    }

    _bindEvents(){
      this.dom.addEventListener('mousemove', e => {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this._updateToolPosition();
      });
      this.dom.addEventListener('mousedown', e => { if(e.button === 0) this._startAction(); });
      this.dom.addEventListener('mouseup', e => { if(e.button === 0) this._endAction(); });
      document.querySelectorAll('.tool').forEach(btn=>{
        btn.addEventListener('click', ()=> {
          document.querySelectorAll('.tool').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          this.tool = btn.dataset.tool;
        });
      });
      document.getElementById('reset').addEventListener('click', ()=> this.reset());
    }

    _updateToolPosition(){
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const plane = new THREE.Plane(new THREE.Vector3(0,1,0), -1.0);
      const p = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, p);
      if(p){
        this.toolMesh.position.copy(p);
        this.toolMesh.position.y = 1.6;
      }
    }

    _startAction(){
      if(this.tool === 'scalpel') this.isCutting = true;
      if(this.tool === 'suture') this._trySuture();
      if(this.tool === 'forceps') this._tryClamp();
    }

    _endAction(){ this.isCutting = false; }

    _tryClamp(){
      const wound = this._nearestWound();
      if(wound){ wound.bleeding = Math.max(0, wound.bleeding - 30); this._message('Clamp applied'); } else this._message('No wound nearby');
    }

    _trySuture(){
      const wound = this._nearestWound();
      if(wound && wound.bleeding < 20 && !wound.closed){ wound.closed = true; this._message('Sutured successfully'); } else this._message('Cannot suture yet');
    }

    _nearestWound(){
      if(this.wounds.length === 0) return null;
      let best = null, bd = 1e9;
      for(const w of this.wounds){ const d = w.pos.distanceTo(this.toolMesh.position); if(d < bd){ bd = d; best = w; } }
      return bd < 0.6 ? best : null;
    }

    update(dt){
      if(this.isCutting){
        if(Math.random() < dt * 6){ const pos = this.toolMesh.position.clone(); pos.y = 1.0; this._createWound(pos); }
      }
      let totalBleed = 0;
      for(const w of this.wounds){ if(!w.closed) { totalBleed += w.bleeding; w.bleeding = Math.max(0, w.bleeding - dt*2); } }
      this.blood = Math.max(0, this.blood - totalBleed * dt * 0.02);
      this.heart = Math.max(0, this.heart - (100 - this.blood) * dt * 0.01);
      this.stress = Math.min(100, this.stress + totalBleed * dt * 0.02);
      if(this.heart <= 0 || this.blood <= 0){ this._message('Patient lost'); this.reset(); }
    }

    _createWound(pos){
      const g = new THREE.SphereGeometry(0.12, 8, 8);
      const m = new THREE.MeshStandardMaterial({color:0x8b0000, emissive:0x330000});
      const mesh = new THREE.Mesh(g, m);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.wounds.push({mesh, pos:mesh.position.clone(), bleeding: 40 + Math.random()*40, closed:false});
      this._message('Wound created');
    }

    _message(text){
      const el = document.getElementById('messages');
      el.textContent = text;
      setTimeout(()=>{ if(el.textContent === text) el.textContent = ''; }, 2500);
    }

    reset(){
      for(const w of this.wounds) this.scene.remove(w.mesh);
      this.wounds = [];
      this.blood = 100;
      this.heart = 100;
      this.stress = 0;
      this._message('Reset');
    }
  }
  window.Surgeon = Surgeon;
})();