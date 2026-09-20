# Asset routing

Choose exactly one primary template, then compose it with `prompts/images/style-lock.md` and relevant constraints.

| Request | Template | Important distinction |
|---|---|---|
| Complete UI concept or pitch image | `screen-concept.template.md` | Presentation-only if text/UI is baked in |
| Mission environment and characters | `mission-scene.template.md` | Produce clean scene art without runtime UI |
| Shelter room/garden/pond | `shelter-area.template.md` | Reserve four readable resident zones |
| Named resident or animation pose | `resident-character.template.md` | Transparent, consistent identity and scale |
| Ladder, bowl, acorn, branch, prop | `interactive-prop.template.md` | Transparent and easy to isolate/hit-test |
| Replace Hungarian presentation copy | `localization-edit.template.md` | Change text only; enumerate exact replacements |

If the request combines multiple distinct assets, create separate prompts and generation calls. A mission background, resident cutout, and ladder prop are three assets even when they appear together in a concept image.

## Reference roles

- **Edit target:** preserve everything except the explicitly permitted change.
- **Style reference:** transfer visual language only; do not copy its composition or characters unless requested.
- **Identity reference:** preserve the named character's recognizable traits and proportions.
- **Composition reference:** preserve spatial arrangement and camera, not incidental text or artifacts.
