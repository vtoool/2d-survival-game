import type { Entity, Vec2 } from './types'
import type { World } from './world'
import { TILE } from './config'

export function len(v: Vec2): number {
  return Math.hypot(v.x, v.y)
}

export function normalize(v: Vec2): Vec2 {
  const l = Math.hypot(v.x, v.y)
  if (l < 1e-6) return { x: 0, y: 0 }
  return { x: v.x / l, y: v.y / l }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

/** True if a circle at (x,y,r) overlaps a solid tile or leaves the world. */
export function blocked(world: World, x: number, y: number, r: number): boolean {
  const w = world.width * TILE
  const h = world.height * TILE
  if (x - r < 0 || y - r < 0 || x + r > w || y + r > h) return true
  const minTx = Math.floor((x - r) / TILE)
  const maxTx = Math.floor((x + r) / TILE)
  const minTy = Math.floor((y - r) / TILE)
  const maxTy = Math.floor((y + r) / TILE)
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (world.tileAt(tx, ty) === 1) return true
    }
  }
  return false
}

/** Integrate velocity with per-axis tile/bounds collision, then separate from solid entities. */
export function moveEntity(world: World, e: Entity, dt: number): void {
  if (e.worldItem) {
    // Items float in place; still clamp to bounds.
    e.pos.x = Math.max(e.radius, Math.min(world.width * TILE - e.radius, e.pos.x))
    e.pos.y = Math.max(e.radius, Math.min(world.height * TILE - e.radius, e.pos.y))
    return
  }

  const nx = e.pos.x + e.vel.x * dt
  if (!blocked(world, nx, e.pos.y, e.radius)) e.pos.x = nx
  else e.vel.x = 0

  const ny = e.pos.y + e.vel.y * dt
  if (!blocked(world, e.pos.x, ny, e.radius)) e.pos.y = ny
  else e.vel.y = 0

  // Separate from other solid entities (trees/rocks block players & animals).
  for (const other of world.entities.values()) {
    if (other === e || !other.solid || other.worldItem) continue
    const dx = e.pos.x - other.pos.x
    const dy = e.pos.y - other.pos.y
    const dist = Math.hypot(dx, dy)
    const minDist = e.radius + other.radius
    if (dist > 0 && dist < minDist) {
      const push = minDist - dist
      e.pos.x += (dx / dist) * push
      e.pos.y += (dy / dist) * push
    }
  }

  // Re-clamp to world bounds after separation.
  const w = world.width * TILE
  const h = world.height * TILE
  e.pos.x = Math.max(e.radius, Math.min(w - e.radius, e.pos.x))
  e.pos.y = Math.max(e.radius, Math.min(h - e.radius, e.pos.y))
}
