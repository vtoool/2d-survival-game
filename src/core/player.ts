import type { Entity, ItemStack } from './types'
import type { World } from './world'
import { PLAYER, XP } from './config'

export function addItem(player: Entity, item: string, count: number): void {
  player.inventory ??= []
  const stack = player.inventory.find((s) => s.item === item)
  if (stack) stack.count += count
  else player.inventory.push({ item, count })
}

export function countItem(player: Entity, item: string): number {
  return player.inventory?.find((s) => s.item === item)?.count ?? 0
}

export function hasItems(player: Entity, cost: ItemStack[]): boolean {
  return cost.every((c) => countItem(player, c.item) >= c.count)
}

export function consume(player: Entity, cost: ItemStack[]): void {
  for (const c of cost) {
    const stack = player.inventory?.find((s) => s.item === c.item)
    if (stack) stack.count -= c.count
  }
  player.inventory = player.inventory?.filter((s) => s.count > 0)
}

/** Recompute a player's harvest/attack power from the tools they own. */
export function recomputePower(player: Entity): void {
  let bonus = 0
  if (countItem(player, 'axe') > 0) bonus += 10
  if (countItem(player, 'pick') > 0) bonus += 10
  if (countItem(player, 'sword') > 0) bonus += 15
  player.power = PLAYER.basePower + bonus
}

export function grantXp(world: World, player: Entity, amount: number): void {
  player.xp = (player.xp ?? 0) + amount
  let level = player.level ?? 1
  while (player.xp >= XP.perLevel(level)) {
    player.xp -= XP.perLevel(level)
    level += 1
    player.maxHp += XP.hpPerLevel
    player.hp = player.maxHp
    world.logger.log({ t: world.time, type: 'levelup', data: { id: player.id, level, maxHp: player.maxHp } })
  }
  player.level = level
}
