(function(){
  class UI {
    constructor(surgeon){
      this.surgeon = surgeon;
      this.heartEl = document.getElementById('heart');
      this.bloodEl = document.getElementById('blood');
      this.stressEl = document.getElementById('stress');
    }
    update(){
      this.heartEl.textContent = Math.round(this.surgeon.heart);
      this.bloodEl.textContent = Math.round(this.surgeon.blood);
      this.stressEl.textContent = Math.round(this.surgeon.stress);
    }
  }
  window.UI = UI;
})();