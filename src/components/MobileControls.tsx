import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { InputState } from '../client/input'

// Universal on-screen controls: a left virtual joystick for movement and two
// right-side action buttons (contextual attack/harvest + eat). Pointer events
// mean they work for touch AND mouse. They write into the shared `input` ref
// that the Phaser scene reads each frame.

const JOY_RADIUS = 64

export default function MobileControls({ input }: { input: React.MutableRefObject<InputState> }): React.JSX.Element {
  const baseRef = useRef<HTMLDivElement>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const knobRef = useRef<HTMLDivElement>(null)

  const setJoy = (x: number, y: number): void => {
    input.current.moveX = x
    input.current.moveY = y
    input.current.joyActive = x !== 0 || y !== 0
    if (knobRef.current && origin.current) {
      knobRef.current.style.transform = `translate(${x * JOY_RADIUS}px, ${y * JOY_RADIUS}px)`
    }
  }

  const onJoyDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const rect = baseRef.current!.getBoundingClientRect()
    origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    onJoyMove(e)
  }

  const onJoyMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!origin.current) return
    let dx = e.clientX - origin.current.x
    let dy = e.clientY - origin.current.y
    const len = Math.hypot(dx, dy)
    if (len > JOY_RADIUS) {
      dx = (dx / len) * JOY_RADIUS
      dy = (dy / len) * JOY_RADIUS
    }
    setJoy(dx / JOY_RADIUS, dy / JOY_RADIUS)
  }

  const onJoyUp = (): void => {
    origin.current = null
    setJoy(0, 0)
  }

  return (
    <>
      {/* Left: virtual joystick */}
      <div
        ref={baseRef}
        onPointerDown={onJoyDown}
        onPointerMove={onJoyMove}
        onPointerUp={onJoyUp}
        onPointerCancel={onJoyUp}
        style={{
          position: 'absolute',
          left: 24,
          bottom: 24,
          width: JOY_RADIUS * 2,
          height: JOY_RADIUS * 2,
          borderRadius: '50%',
          background: 'rgba(255,247,230,0.18)',
          border: '3px solid rgba(255,247,230,0.4)',
          touchAction: 'none',
        }}
      >
        <div
          ref={knobRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 52,
            height: 52,
            marginLeft: -26,
            marginTop: -26,
            borderRadius: '50%',
            background: 'rgba(255,247,230,0.85)',
            boxShadow: '0 3px 0 rgba(0,0,0,0.2)',
          }}
        />
      </div>

      {/* Right: action buttons */}
      <div style={{ position: 'absolute', right: 24, bottom: 28, display: 'flex', gap: 14, alignItems: 'center' }}>
        <button
          onPointerDown={() => (input.current.eatHeld = true)}
          onPointerUp={() => (input.current.eatHeld = false)}
          onPointerCancel={() => (input.current.eatHeld = false)}
          style={btn('#e85b6b')}
        >
          🍓
        </button>
        <button
          onPointerDown={() => (input.current.actionHeld = true)}
          onPointerUp={() => (input.current.actionHeld = false)}
          onPointerCancel={() => (input.current.actionHeld = false)}
          style={{ ...btn('#ffb43b'), width: 84, height: 84, fontSize: 34 }}
        >
          ⚔
        </button>
      </div>
    </>
  )
}

function btn(color: string): React.CSSProperties {
  return {
    width: 64,
    height: 64,
    borderRadius: '50%',
    border: '3px solid rgba(255,247,230,0.6)',
    background: color,
    color: '#fff',
    fontSize: 28,
    fontWeight: 800,
    touchAction: 'none',
    userSelect: 'none',
    boxShadow: '0 4px 0 rgba(0,0,0,0.25)',
  }
}
