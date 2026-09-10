export const MAX_DT = 1 / 30

export function scalar(value, target = value) {
  return { pos: value, vel: 0, target }
}

export function stepScalar(s, k, c, dt, epsX, epsV) {
  const dx = s.pos - s.target
  s.vel += (-k * dx - c * s.vel) * dt
  s.pos += s.vel * dt
  if (Math.abs(s.pos - s.target) < epsX && Math.abs(s.vel) < epsV) {
    s.pos = s.target
    s.vel = 0
    return true
  }
  return false
}

export function stepPoints(pos, vel, target, k, c, dt, epsX, epsV) {
  let settled = true
  for (let i = 0; i < pos.length; i++) {
    const dx = pos[i] - target[i]
    vel[i] += (-k * dx - c * vel[i]) * dt
    pos[i] += vel[i] * dt
    if (settled && (Math.abs(pos[i] - target[i]) > epsX || Math.abs(vel[i]) > epsV)) {
      settled = false
    }
  }
  if (settled) {
    pos.set(target)
    vel.fill(0)
  }
  return settled
}
