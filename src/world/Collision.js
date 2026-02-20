export function circleHit(ax, az, ar, bx, bz, br) {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz <= (ar + br) * (ar + br);
}
