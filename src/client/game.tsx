import Phaser from 'phaser'
import { useEffect, useRef } from 'react'

// Placeholder Phaser scene. Phase 5 will render the World (tiles, entities,
// sprite animations, camera follow) here; for the scaffold it proves the
// canvas boots and the cute theme shows through.
class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }
  create(): void {
    this.cameras.main.setBackgroundColor('#7cc36b')
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Joc\nworld rendering arrives in Phase 5', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '28px',
        color: '#fff7e6',
        align: 'center',
      })
      .setOrigin(0.5)
  }
}

export default function Game({ dev }: { dev: boolean }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current,
      backgroundColor: '#7cc36b',
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: [BootScene],
    })
    return () => game.destroy(true)
  }, [dev])
  return <div ref={ref} style={{ width: '100vw', height: '100vh' }} />
}
