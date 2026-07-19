---
name: visual-testing
description: Automated visual regression testing with screenshot analysis for Joc
metadata:
  category: testing
  framework: playwright
  project: joc
---

## What This Skill Does

Automates visual testing for the cozy Joc UI using Playwright + screenshot analysis:

- Lobby renders with cute theme (meadow green `#7cc36b`, cream text).
- Typography (Baloo 2 display, Nunito UI) renders.
- Responsive across mobile (393×851) and desktop (1280×720).
- No visual glitches; touch targets ≥ 44px.

## When to Use

- New UI components, lobby/HUD changes, responsive checks, regression captures.

## Best Practices

### Screenshot Timing
```javascript
await page.waitForTimeout(2000)
await page.screenshot({ path: 'test-results/shot.png' })
```

### Key States
1. Welcome (name entry)
2. Lobby (after join)
3. Ready toggled
4. Mobile viewport layout

### Viewport Requirements
- Desktop: 1280×720
- Mobile: 393×851 (Pixel 5)

## Color Verification
- Background: meadow `#7cc36b`
- Primary buttons: berry `#e85b6b`
- Text: cream `#fff7e6`

## Mobile Compliance
- `touch-action: none` present
- No horizontal scroll
- Buttons ≥ 44px

## Related Skills
- `multiplayer-sync` — state sync tests
- `style-guide-compliance` — theme checks
- `headless-sim` — logic tests
