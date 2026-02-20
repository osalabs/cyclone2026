export class Screens {
  constructor() {
    this.menu = document.getElementById('menu');
    this.overlay = document.getElementById('top-overlay');
  }
  showMenu(v) { this.menu.classList.toggle('hidden', !v); }
  showOverlay(text) { this.overlay.textContent = text; this.overlay.classList.toggle('hidden', !text); }
}
