export function getHUDRefs() {
  return {
    speedFill: document.getElementById('hud-speed-fill'),
    altFill: document.getElementById('hud-alt-fill'),
    fuelFill: document.getElementById('hud-fuel-fill'),
    timeFill: document.getElementById('hud-time-fill'),
    cratesIcons: document.getElementById('hud-crates-icons'),
    refugees: document.getElementById('hud-refugees'),
    windFill: document.getElementById('hud-wind-fill'),
    windAlert: document.getElementById('hud-wind-alert'),
    aircraftAlert: document.getElementById('hud-aircraft-alert'),
    viewCell: document.getElementById('hud-view-cell'),
    lives: document.getElementById('hud-lives'),
  };
}
