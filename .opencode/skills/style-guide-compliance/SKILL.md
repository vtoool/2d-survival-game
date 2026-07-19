---
name: style-guide-compliance
description: Automated verification of STYLE_GUIDE.md requirements for Joc
metadata:
  category: quality
  reference: STYLE_GUIDE.md
  project: joc
---

## What This Skill Does

Checks UI against `STYLE_GUIDE.md` (cozy/cute Joc theme):

- Palette: meadow `#7cc36b`, forest `#2f6b3a`, wood `#b5793b`, cream `#fff7e6`, sky `#8fd3ff`, berry `#e85b6b`.
- Typography: Baloo 2 (display), Nunito (UI).
- Rounded, soft, sticker aesthetic — no horror/sharp themes.
- Universal Design: NO "Desktop"/"Mobile" text (use Host/Join).
- Mobile-first: `touch-action: none`, `user-select: none`, ≥44px targets.

## When to Use

- Reviewing UI PRs, pre-deploy checks, auditing consistency.

## Automated Checks

### Palette
```javascript
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
expect(bg).toMatch(/124, ?195, ?107|7cc36b/i) // meadow
```

### Universal Design
```javascript
const text = await page.locator('body').innerText()
expect(text).not.toMatch(/Desktop|Mobile/i)
```

### Mobile
```javascript
const box = await page.locator('button').first().boundingBox()
expect(box.height).toBeGreaterThanOrEqual(44)
```

## Common Violations
1. "Desktop"/"Mobile" text → use Host/Join.
2. Wrong green → must be meadow `#7cc36b`.
3. Missing rounded/soft styling.
4. No `touch-action: none`.

## Related Skills
- `visual-testing` — screenshots
- `multiplayer-sync` — sync tests
