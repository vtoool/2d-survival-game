import type { World } from '../core/world'
import type { Entity, Intent, IntentMap } from '../core/types'
import { RECIPES, craft } from '../core/crafting'
import { countItem, hasItems } from '../core/player'

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function nearest(world: World, from: { x: number; y: number }, kinds: Entity['kind'][], maxDist = Infinity): Entity | null {
  let best: Entity | null = null
  let bestD = maxDist
  for (const e of world.entities.values()) {
    if (!kinds.includes(e.kind)) continue
    const d = dist(from, e.pos)
    if (d < bestD) {
      best = e
      bestD = d
    }
  }
  return best
}

/**
 * A scripted "gatherer" bot. Same intent interface a human/remote player uses,
 * so it exercises the exact same simulation code paths. Strategy:
 *   1. Craft tools when affordable (and not already owned).
 *   2. Attack a nearby animal if armed.
 *   3. Otherwise harvest the nearest tree, then the nearest rock.
 */
export function makeGatherBot(playerId: string): (world: World, tick: number) => IntentMap {
  return (world) => {
    const intents: IntentMap = new Map()
    const player = world.entities.get(playerId)
    if (!player) return intents

    if (countItem(player, 'axe') === 0 && hasItems(player, RECIPES[0].cost)) craft(world, player, 'wooden_axe')
    if (countItem(player, 'pick') === 0 && hasItems(player, RECIPES[1].cost)) craft(world, player, 'stone_pick')
    if (countItem(player, 'sword') === 0 && hasItems(player, RECIPES[2].cost)) craft(world, player, 'iron_sword')

    const intent: Intent = { move: { x: 0, y: 0 }, action: null, aim: null, craftId: null }

    const animal = nearest(world, player.pos, ['animal'], 72)
    if (animal && (player.power ?? 0) > 0) {
      intent.aim = { ...animal.pos }
      if (dist(player.pos, animal.pos) <= player.radius + 14 + animal.radius) intent.action = 'attack'
      else intent.move = { x: animal.pos.x - player.pos.x, y: animal.pos.y - player.pos.y }
      intents.set(playerId, intent)
      return intents
    }

    let target = nearest(world, player.pos, ['tree'])
    if (!target) target = nearest(world, player.pos, ['rock'])
    if (!target) {
      intents.set(playerId, intent)
      return intents
    }

    intent.aim = { ...target.pos }
    const reach = player.radius + 14 + target.radius
    if (dist(player.pos, target.pos) <= reach) {
      intent.action = target.kind === 'tree' ? 'chop' : 'mine'
    } else {
      intent.move = { x: target.pos.x - player.pos.x, y: target.pos.y - player.pos.y }
    }
    intents.set(playerId, intent)
    return intents
  }
}
