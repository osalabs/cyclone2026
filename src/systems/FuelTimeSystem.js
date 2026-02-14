export class FuelTimeSystem {
  update(state, dt) {
    const fuelDrain = state.heli.landed ? 0 : 0.65 + Math.abs(state.heli.speedLevel || 0) * 0.2 + (state.heli.alt > 10 ? 0.3 : 0);
    state.fuel = Math.max(0, state.fuel - fuelDrain * dt);
    state.timeLeft -= dt;
    if (state.fuel <= 0 && !state.heli.landed) state.crashReason = 'Out of fuel';
    if (state.timeLeft <= 0) state.gameOver = true;
  }
}
