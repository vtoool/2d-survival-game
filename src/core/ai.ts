import type { Entity } from './types'
import type { World } from './world'
import { ANIMAL, type AnimalTier } from './config'
import { moveEntity } from './movement'

const TAU = Math.PI * 2

/** Simple animal AI: wander when calm; flee (rabbits) or charge (boars) near players. */
export function updateAnimal(world: World, a: Entity, dt: number): void {
  const def = ANIMAL[(a.tier ?? 'rabbit') as AnimalTier]

  a.aiTimer = (a.aiTimer ?? 0) - dt
  a.attackCooldown = Math.max(0, (a.attackCooldown ?? 0) - dt)

  // Find nearest player within aggro radius.
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

  let speed = def.speed
  let heading = a.heading ?? 0

  if (threat && threatDist < def.aggroRadius) {
    const ang = Math.atan2(threat.pos.y - a.pos.y, threat.pos.x - a.pos.x)
    if (def.behaviour === 'flee') {
      a.ai = 'flee'
      speed = def.alarmSpeed
      a.heading = ang + Math.PI // run directly away
    } else {
      a.ai = 'charge'
      speed = def.alarmSpeed // charge speed (>= wander)
      a.heading = ang // run at the player
      maybeBite(world, a, threat)
    }
  } else {
    a.ai = 'wander'
    if ((a.aiTimer ?? 0) <= 0) {
      a.heading = world.rng.range(0, TAU)
      a.aiTimer = 2.5
    }
  }

  heading = a.heading ?? 0
  a.vel.x = Math.cos(heading) * speed
  a.vel.y = Math.sin(heading) * speed
  moveEntity(world, a, dt)

  // Boars deal contact damage when overlapping a player even without a charge hit.
  if (def.contactDamage > 0 && threat) {
    const overlap = threat.radius + a.radius
    if (Math.hypot(threat.pos.x - a.pos.x, threat.pos.y - a.pos.y) <= overlap) {
      maybeBite(world, a, threat)
    }
  }
}

/** Apply the boar's contact attack to a player, respecting its cooldown. */
function maybeBite(world: World, boar: Entity, player: Entity): void {
  if ((boar.attackCooldown ?? 0) > 0) return
  const dmg = boar.contactDamage ?? 0
  if (dmg <= 0) return
  player.hp = Math.max(0, player.hp - dmg)
  boar.attackCooldown = 1
  world.logger.log({ t: world.time, type: 'hit', data: { by: boar.id, target: player.id, dmg } })
}
