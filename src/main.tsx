import { createRoot } from 'react-dom/client'
import { insertCoin, myPlayer } from 'playroomkit'
import App from './App'
import './index.css'

// Network Gate: initialize PlayroomKit BEFORE React renders so the UI can assume
// the connection is ready (mirrors the ghost-coop Gatekeeper pattern).
async function bootstrap(): Promise<void> {
  const isDev = new URLSearchParams(location.search).has('dev')
  if (!isDev) {
    try {
      // skipLobby: our React Lobby replaces Playroom's pre-game UI.
      // NOTE: do NOT pass streamMode — it makes the client a stream viewer,
      // which breaks isHost() and the host-start flow.
      await insertCoin({ skipLobby: true })
      let tries = 0
      while (!myPlayer()?.id && tries < 100) {
        await new Promise((r) => setTimeout(r, 100))
        tries++
      }
    } catch {
      const root = document.getElementById('root')
      if (root) root.innerHTML = '<div style="color:#fff;font-family:sans-serif;padding:2rem">Could not reach multiplayer. Check your connection.</div>'
      return
    }
  }
  const root = document.getElementById('root')
  if (!root) return
  createRoot(root).render(<App dev={isDev} />)
}

void bootstrap()
