# CURSED PAGES — paper-horror slot

A complete 5x3, 20-line video slot in the same hand-cut **paper + ink SVG** style as LuckyKeno and Paper Plane Crash, turned dark.
No build step, no downloads: unzip and double-click `index.html` (works from `file://`, or host the folder anywhere).

## Update v5
- New logo (`logo/logo.webp`); in the intro the logo is now exactly centred on the screen (tagline sits under it).
- Pressing COLLECT after free spins runs the ink transition back to the night world (no sudden background change).
- Win highlight refined: a soft aura centred on the symbol, a symbol-shaped glow, slow light rays and sparks (orange, green for ghost / wild / scatter).

## Update v4
- Backgrounds: `bg/main_bg.webp` and `bg/freespin_bg.webp` sit behind everything (slow camera drift). The old drawn house, trees, hills, graves and moon were removed; stars, clouds, fog, bats, candles and embers stay.
- Win highlight: no square frame any more, winning symbols get a glowing aura with rising sparks (orange, or green for ghost / wild / scatter).
- Free spins start with an ink-flood screen transition (lightning, bats), the world is swapped while the screen is covered.
- Logo updated (`logo/logo.webp`).
- Sounds from `sounds/`: main / free spin music (slow 5 s cross-fade), thunder cycle (distant, loud, 10 s gap), ambient sounds one after another at random, plus reel rotation, reel stop, scatter, wild, win glow and big-win appear. Short ones are embedded in `js/assets.js`. The old synthesized sounds remain as fallback and for everything not covered.
- TEST list is now a small popup.

## Update v3
- Symbols are now the supplied artwork (`symbols/s0..s11.webp`, all normalised to the same box so they share one baseline and size in every cell, the paytable and the buy button). Order: 0 J, 1 Q, 2 K, 3 A, 4 bat, 5 candle, 6 pumpkin, 7 ghost, 8 skull, 9 doll, 10 wild, 11 scatter. Replace a file to change a symbol.
- Logo is the supplied artwork (`logo/logo.webp`) in the header and the intro, sized per device.
- Win: winning symbols do a small zoom in / out and get a gold win frame; the rest dim.

## Update v2
- Realistic volumetric clouds (generated from fractal noise, moon-lit) and real flapping bat silhouettes
- Free Spins now cross-fade into their own world: blood moon, ruined cathedral, hanging chains, lava cracks, ritual circle, floating candles, rising embers
- TEST button (under the menu button): forces Normal / Big / Mega / Epic win or Free Spins so every feature can be seen. Delete the `#btnTest` line in `index.html` to remove it.
- New cinematic intro (js/intro.js): chained grimoire, lightning, chains snap, 3D cover and page flips, dive into the ritual circle, title slam. SKIP is always available; "Reduce motion" gives a short fade instead.

## Features
- Spin, quick stop (tap SPIN while reels move), QUICK / TURBO speed, Autoplay (10-500), Max bet, bet ladder 20-2,000
- Wild black cat (reels 2-4), Scatter grimoire, **Lightning Wild** (a bolt turns a whole reel wild), scatter tension on the 3rd scatter
- **Free Spins** 8/12/20: curse multiplier x1 to x5, haunted cat wilds stay one more spin, retrigger, **Buy Free Spins** (80x)
- Win presentation: line cycling, normal win, **BIG (10x) / MEGA (25x) / EPIC (50x)** screens, 5,000x max win cap
- Paytable (5 pages: symbols, specials, free spins, 20 paylines, rules), Settings, Stats and history, Menu
- Responsive: phone portrait + landscape, tablet, desktop, safe-area aware, rebuilt on resize / rotation
- 12 hand-drawn SVG symbols (code, no images), generated paper textures, night scene, lightning, bats, fog, particles
- All audio synthesized live (music-box lullaby over a drone, wind, thunder, stings). Settings are saved in localStorage.

## Files
```
index.html  style.css
js/math.js     all maths (shared with node)      js/art.js    symbols, icons, logo, spin seal
js/core.js     helpers, saved data, viewport     js/scene.js  textures, night scene, torn frame, bats
js/reels.js    reel engine                       js/fx.js     lightning, particles, shake, storm
js/sky.js      clouds, bats, background paintings    js/intro.js  cinematic intro
js/ui.js       menus, paytable, big win screens  js/audio.js  synth music + sfx
js/game.js     spin flow, free spins, autoplay   js/main.js   boot
tools/simulate.js   RTP simulator
```

## Maths (simulated, 3,000,000 rounds)
`node tools/simulate.js 3000000` -> RTP **96.0 %**, hit frequency 32 %, free spins about 1 in 192 spins.
`node tools/simulate.js 400000 --buy` -> buy feature returns about 97 % of its 80x price.
Edit pays / reel strips / lightning chance at the top of `js/math.js`, then re-run the simulator.
The same file is used by the game, so the number you simulate is the number you play.

## Keys
Space / Enter spin or stop - Up / Down bet - A autoplay - T speed - Esc close

## Notes
Virtual credits only, no real money. This is a demo build: the RNG is the browser's crypto RNG, there is no server or certification.
URL `?skip` skips the splash screen (handy for testing).

## Publish on GitHub Pages
The game is 100 % static (no server, no build step, no external links), so it runs as is on GitHub Pages:
1. Put the contents of this folder at the root of a repository (`index.html` must be at the top level) and push.
2. Repository -> Settings -> Pages -> Source: "Deploy from a branch", Branch: `main`, folder `/ (root)` -> Save.
3. Open `https://<your-name>.github.io/<repo>/` after about a minute. (Opening `index.html` by double-click also works.)

Good to know:
- All paths are relative and every file name matches its upper/lower case exactly (GitHub is case-sensitive, Windows is not). Keep it that way when you rename files.
- Sound starts after the first tap/click (browser rule), the game already handles this.
- Saved data lives in the browser's localStorage under the key `cursed-pages-slot-v1` (per browser, not shared).
- After you push an update, change the `?v=` number on the script/style tags in `index.html` so players do not get the old cached files.
- Whole project is about 10 MB (the two music tracks are 6.6 MB of it), far below GitHub's limits.
