# PLAYLAB™ — a digital playground

Not a portfolio. An interactive misuse of the internet: three mini-games, a
camera mirror, a WebGL shader hero, synth sound effects, and four secrets.
Zero frameworks, zero build step, zero npm — vanilla JS + Canvas + raw WebGL.

## The zones

| Zone | Style | What happens |
|---|---|---|
| **BOOT** | green terminal | fake loading screen that lies about progress |
| **HERO** | iridescent shader | domain-warped fbm noise (raw WebGL), mouse-reactive; letters scatter on hover |
| **01 · DINO.EXE** | neon arcade | chaotic runner: mimic coins, lying "CONTROLS REVERSED" signs, moon gravity, speed surges, ground gaps — plus a fitting room (5 skins, 5 hats, 3 faces, chain) persisted in localStorage |
| **02 · THE FLOOR IS A LIE** | noir | glass-bridge trust exercise; labels & arrows lie; two scripted betrayals |
| **03 · CURSOR_SURVIVOR** | glitch | bullet-hell where your cursor is the hero; real stars grant slow-mo, bait stars (red core) spawn a punishment squad |
| **04 · MIRROR.SYS** | soft/3D | webcam with 4 live effects (thermal/ascii/glitch/mosaic) + frame-diff motion detection that feeds particles and re-tints the zone. Everything stays on-device |
| **VAULT** | ink | secrets ledger + a button you should not press |

## Secrets (4)

1. Konami code (↑↑↓↓←→←→BA) → god mode
2. type `dino` anywhere → summoned
3. click the logo 5× fast → barrel roll
4. DO NOT PRESS → find out

## Run locally

Open `index.html`, or:

```bash
cd glv5
python3 -m http.server 8770
# → http://localhost:8770
```

## Deploy

Static files. Drag the folder onto https://app.netlify.com/drop, or push to
GitHub and enable Pages. `netlify.toml` included.

## Tech notes

- SFX are WebAudio oscillators — no audio files. Mute persists.
- All game loops pause when their zone is offscreen (IntersectionObserver).
- Shader falls back to CSS gradient without WebGL; cursor and boot respect
  `prefers-reduced-motion`; custom cursor disabled on touch.
- Camera frames never leave the browser.
