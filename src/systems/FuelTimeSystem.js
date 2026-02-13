export class FuelTimeSystem {
  update(state, dt) {
    const fuelDrain = 0.95 + (state.heli.boost ? 1.2 : 0) + (state.heli.alt > 10 ? 0.3 : 0);
    state.fuel -= fuelDrain * dt;
    state.timeLeft -= dt;
    if (state.fuel <= 0) state.crashReason = 'Out of fuel';
    if (state.timeLeft <= 0) state.gameOver = true;
  }
}
