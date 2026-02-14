export function getHUDRefs() {
  return {
    speed: document.getElementById('hud-speed'),
    speedGauge: document.getElementById('hud-speed-gauge'),
    alt: document.getElementById('hud-alt'),
    altGauge: document.getElementById('hud-alt-gauge'),
    fuel: document.getElementById('hud-fuel'),
    fuelGauge: document.getElementById('hud-fuel-gauge'),
    time: document.getElementById('hud-time'),
    timeFill: document.getElementById('hud-time-fill'),
    cratesIcons: document.getElementById('hud-crates-icons'),
    refugees: document.getElementById('hud-refugees'),
    windFill: document.getElementById('hud-wind-fill'),
    windAlert: document.getElementById('hud-wind-alert'),
    planeFill: document.getElementById('hud-plane-fill'),
    planeAlert: document.getElementById('hud-plane-alert'),
    view: document.getElementById('hud-view'),
    tilt: document.getElementById('hud-tilt'),
  };
}
