import type { World } from '../core/world'
import type { Entity, Intent, IntentMap } from '../core/types'
import { RECIPES, craft } from '../core/crafting'
import { countItem, hasItems } from '../core/player'

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function norm(v: { x: number; y: number }): { x: number; y: number } {
  const m = Math.hypot(v.x, v.y) || 1
  return { x: v.x / m, y: v.y / m }
}

function nearest(
  world: World,
  from: { x: number; y: number },
  kinds: Entity['kind'][],
  maxDist = Infinity
): Entity | null {
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
 * A scripted "survivor" bot. Same intent interface a human/remote player uses,
 * so it exercises the exact same simulation code paths. Strategy (phased):
 *   1. Craft tools as soon as affordable (axe -> pick -> sword).
 *   2. While under-armed, gather a balanced mix of wood + stone so all tools
 *      can be crafted (mining rocks does NOT require an existing pick).
 *   3. Once armed, commit to hunting the nearest animal: lock onto one target,
 *      keep moving into it while attacking so fleeing prey can't escape.
 */
export function makeGatherBot(playerId: string): (world: World, tick: number) => IntentMap {
  // Closure state: the animal the bot is currently committed to hunting.
  let huntTargetId: string | null = null

  return (world) => {
    const intents: IntentMap = new Map()
    const player = world.entities.get(playerId)
    if (!player) return intents

    // 1. Craft tools greedily whenever affordable.
    if (countItem(player, 'axe') === 0 && hasItems(player, RECIPES[0].cost)) craft(world, player, 'wooden_axe')
    if (countItem(player, 'pick') === 0 && hasItems(player, RECIPES[1].cost)) craft(world, player, 'stone_pick')
    if (countItem(player, 'sword') === 0 && hasItems(player, RECIPES[2].cost)) craft(world, player, 'iron_sword')

    const intent: Intent = { move: { x: 0, y: 0 }, action: null, aim: null, craftId: null }
    const armed = (player.power ?? 0) >= 25 // has the sword

    // 3. Hunt: commit to one animal once we have a weapon.
    if (armed) {
      let target = huntTargetId ? world.entities.get(huntTargetId) : null
      if (!target || target.kind !== 'animal') {
        target = nearest(world, player.pos, ['animal'], 220)
        huntTargetId = target ? target.id : null
      }
      if (target) {
        const toTarget = { x: target.pos.x - player.pos.x, y: target.pos.y - player.pos.y }
        intent.aim = { ...target.pos }
        intent.move = norm(toTarget) // keep closing even while attacking
        const reach = player.radius + 14 + target.radius
        if (dist(player.pos, target.pos) <= reach) intent.action = 'attack'
        intents.set(playerId, intent)
        return intents
      }
      huntTargetId = null
    }

    // 2. Gather: pick the nearest tree OR rock so we can afford every tool.
    const tree = nearest(world, player.pos, ['tree'])
    const rock = nearest(world, player.pos, ['rock'])
    const dTree = tree ? dist(player.pos, tree.pos) : Infinity
    const dRock = rock ? dist(player.pos, rock.pos) : Infinity
    const target = dTree <= dRock ? tree : rock
    if (!target) {
      intents.set(playerId, intent)
      return intents
    }

    const toTarget = { x: target.pos.x - player.pos.x, y: target.pos.y - player.pos.y }
    intent.aim = { ...target.pos }
    intent.move = norm(toTarget)
    const reach = player.radius + 14 + target.radius
    if (dist(player.pos, target.pos) <= reach) {
      intent.action = target.kind === 'tree' ? 'chop' : 'mine'
    }
    intents.set(playerId, intent)
    return intents
  }
}
