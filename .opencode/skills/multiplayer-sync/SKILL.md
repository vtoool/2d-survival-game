---
name: multiplayer-sync
description: Testing real-time multiplayer state synchronization for PlayroomKit games
metadata:
  category: testing
  framework: playroomkit
  project: joc
---

## What This Skill Does

Patterns for testing 2+ player real-time interactions in Joc (PlayroomKit, WebRTC):

- Player join/leave sync
- Ready-state propagation
- Game-start flow (lobby → world)
- World-state sync (once Phase 7 lands)
- Race-condition detection

## When to Use

When testing host/guest behavior, networking, or lobby flow.

## Best Practices

### Browser Context Isolation
```javascript
const hostContext = await chromium.launchPersistentContext('', { viewport: { width: 1280, height: 720 } })
const joinerContext = await chromium.launchPersistentContext('', { viewport: { width: 393, height: 851 } })
```

### Timing
PlayroomKit init takes 8–15s. Wait 2–3s after state changes; max wait 5s.

### Bidirectional Verification
Verify both directions: host action → guest sees it, and vice versa.

### Session Cleanup
```javascript
test.afterAll(async () => { await hostContext?.close(); await joinerContext?.close() })
```

## Room Code Format
Joc uses PlayroomKit's default hash room code: `#r=XXXXX`.

## Troubleshooting
- Players don't see each other → room codes/URLs must match exactly.
- State doesn't propagate → wait longer between action and assertion.
- Session pollution → use incognito/persistent contexts fresh per run.

## Related Skills
- `headless-sim` — logic validation without a browser
- `visual-testing` — screenshot verification
