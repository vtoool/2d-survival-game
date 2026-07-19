import type { Entity } from './types'
import type { World } from './world'
import { ANIMAL } from './config'
import { moveEntity } from './movement'

const TAU = Math.PI * 2

/** Simple animal AI: wander when calm, flee from nearby players. */
export function updateAnimal(world: World, a: Entity, dt: number): void {
  a.aiTimer = (a.aiTimer ?? 0) - dt

  // Find nearest player within flee radius.
  let threat: Entity | null = null
  let threatDist = Infinity
  for (const e of world.entities.values()) {
    if (e.kind !== 'player') continue
    const d = Math.hypot(e.pos.x - a.pos.x, e.pos.y - a.pos.y)
    if (d < threatDist) {
      threat = e
      threatDist = d
    }
  }

  let speed = ANIMAL.speed
  if (threat && threatDist < ANIMAL.fleeRadius) {
    a.ai = 'flee'
    speed = ANIMAL.fleeSpeed
    // Heading directly away from the threat.
    const ang = Math.atan2(a.pos.y - threat.pos.y, a.pos.x - threat.pos.x)
    a.heading = ang
  } else {
    a.ai = 'wander'
    if ((a.aiTimer ?? 0) <= 0) {
      a.heading = world.rng.range(0, TAU)
      a.aiTimer = ANIMAL.wanderRetarget
    }
  }

  const h = a.heading ?? 0
  a.vel.x = Math.cos(h) * speed
  a.vel.y = Math.sin(h) * speed
  moveEntity(world, a, dt)
}
