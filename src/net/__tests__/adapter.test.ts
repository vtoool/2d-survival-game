import { describe, it, expect } from 'vitest'
import { World, TILE } from '../../core'
import { serializeWorld, applySnapshot, encodeIntent, decodeIntent } from '../playroomAdapter'

describe('net adapter', () => {
  it('round-trips the whole world through serialize/applySnapshot', () => {
    const a = new World({ width: 20, height: 20, seed: 9 })
    a.spawnPlayer({ x: 100, y: 100 }, 'p1')
    a.spawnResource('tree', { x: 200, y: 200 })
    a.spawnResource('berry', { x: 240, y: 240 })
    a.spawnAnimal({ x: 300, y: 300 }, 'boar')
    a.spawnItem({ x: 150, y: 150 }, 'wood', 3)
    const player = a.entities.get('p1')!
    player.inventory = [{ item: 'wood', count: 5 }]
    player.level = 3
    player.xp = 12

    const snap = serializeWorld(a)

    const b = new World({ width: 20, height: 20, seed: 9 })
    applySnapshot(b, snap)

    expect(b.entities.size).toBe(a.entities.size)
    for (const [id, e] of a.entities) {
      const t = b.entities.get(id)
      expect(t).toBeDefined()
      expect(t!.kind).toBe(e.kind)
      expect(t!.pos.x).toBeCloseTo(e.pos.x, 0)
      expect(t!.pos.y).toBeCloseTo(e.pos.y, 0)
      expect(t!.hp).toBeCloseTo(e.hp, 0)
      if (e.kind === 'animal') expect(t!.tier).toBe(e.tier)
      if (e.kind === 'player') {
        expect(t!.level).toBe(3)
        expect(t!.xp).toBe(12)
        expect(t!.inventory?.[0]).toEqual({ item: 'wood', count: 5 })
      }
      if (e.worldItem) expect(t!.worldItem).toEqual(e.worldItem)
    }
  })

  it('encodes and decodes intents losslessly', () => {
    const cases = [
      { move: { x: 0, y: 0 }, action: null, aim: null, craftId: null },
      { move: { x: -1, y: 1 }, action: 'attack', aim: { x: 5.5, y: -3 }, craftId: null },
      { move: { x: 0.3, y: -0.7 }, action: 'forage', aim: null, craftId: 'wooden_axe' },
      { move: { x: 1, y: 0 }, action: 'eat', aim: { x: 0, y: 0 }, craftId: null },
    ]
    for (const intent of cases) {
      const back = decodeIntent(encodeIntent(intent as never))
      expect(back).toEqual(intent)
    }
  })

  it('drops entities missing from a later snapshot', () => {
    const a = new World({ width: 10, height: 10, seed: 1 })
    a.spawnResource('rock', { x: TILE * 3, y: TILE * 3 })
    const snap1 = serializeWorld(a)
    a.remove([...a.entities.keys()][0])
    const snap2 = serializeWorld(a)
    const b = new World({ width: 10, height: 10, seed: 1 })
    applySnapshot(b, snap1)
    expect(b.entities.size).toBe(1)
    applySnapshot(b, snap2)
    expect(b.entities.size).toBe(0)
  })
})
