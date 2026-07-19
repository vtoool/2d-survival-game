import type { Entity, Intent } from './types'
import type { World } from './world'
import { PLAYER } from './config'
import { moveEntity, normalize, sub } from './movement'
import { grantXp } from './player'

/** Apply a player's intent for one tick: movement, facing, and (throttled) action. */
export function applyIntent(world: World, player: Entity, intent: Intent, dt: number): void {
  const dir = normalize(intent.move)
  player.vel.x = dir.x * PLAYER.speed
  player.vel.y = dir.y * PLAYER.speed

  if (intent.aim) player.facing = normalize(sub(intent.aim, player.pos))

  moveEntity(world, player, dt)

  player.attackCooldown = Math.max(0, (player.attackCooldown ?? 0) - dt)
  if (intent.action && (player.attackCooldown ?? 0) <= 0) {
    performAction(world, player, intent)
    player.attackCooldown = PLAYER.actionCooldown
  }
}

function performAction(world: World, player: Entity, intent: Intent): void {
  const power = player.power ?? PLAYER.basePower

  // Eating consumes a berry from inventory to restore HP — no target needed.
  if (intent.action === 'eat') {
    if ((player.hp ?? 0) >= (player.maxHp ?? PLAYER.maxHp)) return
    const stack = player.inventory?.find((s) => s.item === 'berry')
    if (!stack || stack.count <= 0) return
    stack.count -= 1
    player.inventory = player.inventory?.filter((s) => s.count > 0)
    player.hp = Math.min(player.maxHp ?? PLAYER.maxHp, (player.hp ?? 0) + PLAYER.berryHeal)
    world.logger.log({ t: world.time, type: 'eat', data: { by: player.id, heal: PLAYER.berryHeal, hp: player.hp } })
    return
  }

  const reach = player.radius + PLAYER.reach
  let best: Entity | null = null
  let bestDist = Infinity
  for (const e of world.entities.values()) {
    if (e.kind !== 'tree' && e.kind !== 'rock' && e.kind !== 'animal' && e.kind !== 'berry') continue
    const d = Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y)
    if (d <= reach + e.radius && d < bestDist) {
      best = e
      bestDist = d
    }
  }
  if (!best) return

  if (intent.action === 'attack' && best.kind === 'animal') {
    best.hp -= power
    world.logger.log({ t: world.time, type: 'attack', data: { by: player.id, target: best.id, dmg: power, hp: Math.max(0, best.hp) } })
    if (best.hp <= 0) killAnimal(world, player, best)
    return
  }

  const harvestAction = intent.action === 'chop' || intent.action === 'mine' || intent.action === 'forage'
  if (harvestAction && best.kind !== 'animal') {
    if (best.harvestAction !== intent.action) return // wrong action for this resource
    best.hp -= power
    world.logger.log({ t: world.time, type: 'harvest', data: { by: player.id, target: best.id, kind: best.kind, dmg: power, hp: Math.max(0, best.hp) } })
    if (best.hp <= 0) destroyResource(world, best)
  }
}

function destroyResource(world: World, e: Entity): void {
  world.remove(e.id)
  world.logger.log({ t: world.time, type: 'destroy', data: { id: e.id, kind: e.kind, pos: { x: e.pos.x, y: e.pos.y } } })
  dropLoot(world, e)
}

function killAnimal(world: World, player: Entity, e: Entity): void {
  world.remove(e.id)
  world.logger.log({ t: world.time, type: 'kill', data: { id: e.id, by: player.id, pos: { x: e.pos.x, y: e.pos.y } } })
  dropLoot(world, e)
  grantXp(world, player, e.xp ?? 0)
}

function dropLoot(world: World, e: Entity): void {
  if (!e.lootTable) return
  for (const entry of e.lootTable) {
    const count = world.rng.int(entry.min, entry.max)
    if (count <= 0) continue
    const jitterX = e.pos.x + world.rng.range(-8, 8)
    const jitterY = e.pos.y + world.rng.range(-8, 8)
    const item = world.spawnItem({ x: jitterX, y: jitterY }, entry.item, count)
    world.logger.log({ t: world.time, type: 'drop', data: { item: entry.item, count, pos: { x: item.pos.x, y: item.pos.y } } })
  }
}
