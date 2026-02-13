# Cyclone2026: ZX Rescue

Cyclone2026: ZX Rescue is a static HTML/JS (ES modules) helicopter rescue game inspired by classic 80s design. You collect 5 medical crates across seeded islands while avoiding a roaming cyclone and crossing planes.

## Controls
- Move: **WASD** or **Arrow Keys**
- Altitude: **R** ascend, **F** descend
- Boost: **Shift**
- Toggle North/South camera: **V**
- Toggle expanded minimap: **M**
- Emergency landing: **L** (low altitude over land)
- Pause: **Esc**

## Seeds
- Default seed: `ZXRESCUE`.
- Enter any seed before starting.
- The same seed reproduces terrain, islands, base, crates/refugees/helipads, and cyclone path schedule.

## Run locally
Because this is ESM + CDN modules, use a static server.

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## GitHub Pages
1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set **Deploy from branch**.
4. Pick your branch and `/ (root)` folder.
5. Save and open the published URL.

## Disclaimer
Unofficial fan-inspired project. No original Cyclone assets, ROM, or code are used.
