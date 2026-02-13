export function getHUDRefs() {
  return {
    speed: document.getElementById('hud-speed'),
    alt: document.getElementById('hud-alt'),
    fuel: document.getElementById('hud-fuel'),
    time: document.getElementById('hud-time'),
    crates: document.getElementById('hud-crates'),
    refugees: document.getElementById('hud-refugees'),
    wind: document.getElementById('hud-wind'),
    danger: document.getElementById('hud-danger'),
    view: document.getElementById('hud-view'),
    plane: document.getElementById('hud-plane'),
  };
}
