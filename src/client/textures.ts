import Phaser from 'phaser'
import type { Entity } from '../core'

/**
 * Art pass (Phase 8): static Kenney sprites, with code-drawn primitives as a
 * safe fallback whenever a Kenney texture is unavailable. The simulation is
 * untouched — this file only maps entity kinds to artwork.
 *
 * Packs used (added by the user):
 *   - animal-pack-remastered  → rabbit / boar(pig) critters
 *   - foliage-sprites (Flat)  → white silhouettes we tint for tree/rock/bush
 *   - ui-pack / ui-pack-adventure → (kept for future HUD work)
 */

export interface TexDef {
  key: string
  path: string
}

export const KENNEY_TEXTURES: TexDef[] = [
  { key: 'kenney_rabbit', path: '/kenney/animal-pack-remastered/PNG/Round/rabbit.png' },
  { key: 'kenney_boar', path: '/kenney/animal-pack-remastered/PNG/Round/pig.png' },
  { key: 'kenney_tree', path: '/kenney/foliage-sprites/PNG/Flat/sprite_0034.png' },
  { key: 'kenney_rock', path: '/kenney/foliage-sprites/PNG/Flat/sprite_0044.png' },
  { key: 'kenney_bush', path: '/kenney/foliage-sprites/PNG/Flat/sprite_0039.png' },
  { key: 'kenney_berry', path: '/kenney/foliage-sprites/PNG/Flat/sprite_0040.png' },
]

/** Tint applied to the (white) foliage silhouettes. */
export const KENNEY_TINT: Record<string, number> = {
  kenney_tree: 0x3f9d4f,
  kenney_rock: 0x9aa0a6,
  kenney_bush: 0x4caf50,
  kenney_berry: 0x4caf50,
}

/** Pick a Kenney texture key for an entity, or null if none is mapped. */
export function kenneyTextureFor(e: Entity): string | null {
  switch (e.kind) {
    case 'animal':
      return e.tier === 'boar' ? 'kenney_boar' : 'kenney_rabbit'
    case 'tree':
      return 'kenney_tree'
    case 'rock':
      return 'kenney_rock'
    case 'berry':
      return 'kenney_berry'
    default:
      return null
  }
}

/** Primitive fallback texture key (always generated at runtime). */
export function primTextureFor(e: Entity): string {
  switch (e.kind) {
    case 'animal':
      return e.tier === 'boar' ? 'prim_boar' : 'prim_rabbit'
    case 'tree':
      return 'prim_tree'
    case 'rock':
      return 'prim_rock'
    case 'berry':
      return 'prim_berry'
    case 'item':
      return 'prim_item'
    default:
      return 'prim_item'
  }
}

interface Display {
  h?: number
  w?: number
  originY: number
  flipByFacing?: boolean
}

export const DISPLAY: Record<string, Display> = {
  tree: { h: 48, originY: 0.82 },
  rock: { h: 30, originY: 0.72 },
  berry: { h: 30, originY: 0.75 },
  animal: { w: 34, originY: 0.62, flipByFacing: true },
  item: { h: 14, originY: 0.5 },
}

/** Build the code-drawn primitive textures so the game never shows nothing. */
export function createPrimitiveTextures(scene: Phaser.Scene): void {
  const make = (
    key: string,
    w: number,
    h: number,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ): void => {
    if (scene.textures.exists(key)) return
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    draw(g)
    g.generateTexture(key, w, h)
    g.destroy()
  }

  make('prim_tree', 30, 44, (g) => {
    g.fillStyle(0x8a5a2b, 1)
    g.fillRect(11, 24, 8, 18)
    g.fillStyle(0x3f9d4f, 1)
    g.fillCircle(15, 16, 14)
  })
  make('prim_rock', 32, 28, (g) => {
    g.fillStyle(0x9aa0a6, 1)
    g.fillCircle(16, 14, 13)
    g.fillStyle(0xb6bcc2, 1)
    g.fillCircle(12, 11, 5)
  })
  make('prim_berry', 28, 26, (g) => {
    g.fillStyle(0x4caf50, 1)
    g.fillCircle(14, 13, 12)
    g.fillStyle(0xe85b6b, 1)
    g.fillCircle(9, 10, 3)
    g.fillCircle(18, 13, 3)
    g.fillCircle(13, 18, 3)
  })
  make('prim_rabbit', 20, 20, (g) => {
    g.fillStyle(0xd8c39a, 1)
    g.fillCircle(10, 11, 8)
  })
  make('prim_boar', 30, 26, (g) => {
    g.fillStyle(0x6b4a3a, 1)
    g.fillCircle(15, 13, 12)
  })
  make('prim_item', 14, 14, (g) => {
    g.fillStyle(0xffffff, 1)
    g.fillCircle(7, 7, 6)
  })
  make('berry_dots', 30, 26, (g) => {
    g.fillStyle(0xe85b6b, 1)
    g.fillCircle(9, 10, 3)
    g.fillCircle(20, 13, 3)
    g.fillCircle(14, 19, 3)
    g.fillStyle(0xff8a98, 1)
    g.fillCircle(9, 9, 1.2)
    g.fillCircle(20, 12, 1.2)
    g.fillCircle(14, 18, 1.2)
  })
}
