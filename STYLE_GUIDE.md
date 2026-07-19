# Style Guide — Joc (cozy/cute)

## Palette
| Token | Hex | Use |
|-------|-----|-----|
| Meadow (bg) | `#7cc36b` | Base background, grass |
| Forest | `#2f6b3a` | Panels, deep foliage, text on light |
| Wood | `#b5793b` | Structures, UI frames |
| Cream | `#fff7e6` | Primary text, light surfaces |
| Sky | `#8fd3ff` | Accents, ready states |
| Berry | `#e85b6b` | Primary buttons, highlights |

## Typography
- **Display:** Baloo 2 (rounded, friendly) — titles, big numbers.
- **UI:** Nunito — body, buttons, HUD.
- Fallbacks: `'Trebuchet MS'`, `'Segoe UI'`, sans-serif.

## Feel
- Rounded corners (12–20px radii), soft shadows, chunky pressable buttons.
- Pastel, saturated, "sticker" aesthetic. No harsh edges, no horror themes.
- Animations: gentle bounces, idle bobbing, soft pops on pickup/craft.

## Mobile Requirements
- Viewport meta set (done in `index.html`).
- `touch-action: none`, `user-select: none` (global).
- Touch targets ≥ 44px.
- No horizontal scroll (`overscroll-behavior: none`).

## Verification
See `style-guide-compliance` skill. Quick checks:
- Background computes to meadow green.
- No "Desktop"/"Mobile" text anywhere.
- Buttons use `.btn-primary` / `.btn-ghost` classes.
