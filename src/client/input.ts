// Shared, framework-agnostic input state. Written by on-screen controls
// (joystick + action buttons) and read by the Phaser scene to build intents.
// Works for both touch and mouse, so it is "universal" (no Desktop/Mobile split).

export interface InputState {
  /** Normalized joystick/move vector, each component in [-1, 1]. */
  moveX: number
  moveY: number
  joyActive: boolean
  /** Right-side action button held (contextual chop/mine/forage/attack). */
  actionHeld: boolean
  /** Right-side eat button held. */
  eatHeld: boolean
}

export function createInputState(): InputState {
  return { moveX: 0, moveY: 0, joyActive: false, actionHeld: false, eatHeld: false }
}
