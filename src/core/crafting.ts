import type { Entity, ItemStack } from './types'
import type { World } from './world'
import { consume, hasItems, addItem, recomputePower } from './player'

export interface Recipe {
  id: string
  name: string
  out: ItemStack
  cost: ItemStack[]
}

export const RECIPES: Recipe[] = [
  { id: 'wooden_axe', name: 'Wooden Axe', out: { item: 'axe', count: 1 }, cost: [{ item: 'wood', count: 3 }] },
  { id: 'stone_pick', name: 'Stone Pick', out: { item: 'pick', count: 1 }, cost: [{ item: 'wood', count: 2 }, { item: 'stone', count: 3 }] },
  { id: 'iron_sword', name: 'Iron Sword', out: { item: 'sword', count: 1 }, cost: [{ item: 'wood', count: 2 }, { item: 'stone', count: 4 }] },
]

export function craft(world: World, player: Entity, recipeId: string): boolean {
  const recipe = RECIPES.find((r) => r.id === recipeId)
  if (!recipe) {
    world.logger.log({ t: world.time, type: 'craft_fail', data: { by: player.id, reason: 'unknown_recipe', recipeId } })
    return false
  }
  if (!hasItems(player, recipe.cost)) {
    world.logger.log({ t: world.time, type: 'craft_fail', data: { by: player.id, reason: 'insufficient', recipeId } })
    return false
  }
  consume(player, recipe.cost)
  addItem(player, recipe.out.item, recipe.out.count)
  recomputePower(player)
  world.logger.log({ t: world.time, type: 'craft', data: { by: player.id, recipeId, out: recipe.out } })
  return true
}
