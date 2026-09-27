# Ferret: The Hidden Path

A cozy, story-driven 3D adventure that runs in any modern browser. You play Milo, a young
ferret who hears a strange noise under the house one night and follows it through the
neighbourhood, into Hollow Wood, and back home again.

## Run it

Open `index.html` in Chrome, Edge, Firefox or Safari. No build step and no server needed.
Three.js (r128) loads from cdnjs, so you need an internet connection the first time.
If your browser blocks scripts from `file://`, run any static server in this folder,
for example `python3 -m http.server`, then visit http://localhost:8000.

## Controls

| Action | Keyboard & mouse | Controller |
| --- | --- | --- |
| Move | WASD / arrows | Left stick |
| Run | Shift | RT / RB |
| Jump | Space | A |
| Interact, talk, dig | E | X |
| Scent vision | Q | Y |
| Look around | Drag the mouse, wheel to zoom | Right stick |
| Satchel | I | Back |
| Map | M | LB |
| Pause | Esc (or P) | Start |
| Weasel war dance | F | LB + RB |
| Conversation log | H | |

Touch controls appear automatically on phones and tablets.

## Project layout

```
index.html        page structure: HUD, dialogue box, menus, title screen, touch controls
style.css         interface styles
js/engine.js      utilities, input (keyboard, mouse, gamepad, touch), synthesised audio,
                  procedural textures and materials
js/actors.js      Milo (procedural, animated), the five NPCs, item models, portraits
js/world.js       the whole world: house, garage, basement, backyard, street, neighbours,
                  shop, park, forest, creek, workshop, cave, tunnels; colliders, areas,
                  vegetation instancing, static-mesh batching, scent navigation graph
js/story.js       data: items, collectibles, objectives, NPC placement, dialogue, interactions
js/game.js        systems: renderer, day/night + weather, player physics, camera,
                  NPC behaviour, interaction, quests, dialogue UI, inventory, map,
                  clue board, save/load, menus, main loop
```

## Systems at a glance

- **Story**: five chapters plus an epilogue, driven by `G.STEPS` objectives. Dialogue changes
  with chapter, step and earlier choices (Tilly, Pip, Moss, Nora and Bram all remember).
- **Ferret abilities**: squeeze under furniture and through holes (automatic crouch), dig
  marked soft ground, climb low furniture by walking into it, scent vision (Q) that draws a
  glowing trail to the current objective and reveals hidden things.
- **Save system**: autosave plus three manual slots in `localStorage`, with an in-memory
  fallback if storage is blocked. Settings persist separately.
- **Day/night & weather**: time passes (3 real minutes per game hour), with story weather per
  chapter (rain in chapter four, fog in the woods) or a fixed weather from Settings.
- **Audio**: everything is generated live with the Web Audio API: Karplus-Strong guitar
  music that follows the mood, a music-box melody, rain, wind, creek, crickets, birds, owls,
  footsteps per surface and ferret "dooks".

## Update: More to Discover (`js/expansion.js`)

- **Secret places**: a passage inside the walls (behind the bedroom wardrobe to the garage), a garage crawlspace behind a pushable box, Moss's den under the apple tree, the storm drain under Maple Street (front yard to park), a hideout behind the shop's dumpster, a bush tunnel behind the tool shed, and Fern Hollow, a hidden glade in the forest reached through a hollow log.
- **Story missions**: Juniper's Bell (Bram), Arlo's Lost Postcard (Nora), Night Tracks (Tilly). Side quests: Sneaky Sparrow (Dot) and The Lost Duckling (Mabel).
- **Background animals**: sparrows, ducks and ducklings, frogs, Hoot the owl, Shelly the snail, Crumb the mouse, butterflies, dragonflies and bird flocks. Six of them talk.
- **Abilities**: hiding (stand still under furniture or in a bush), crawl tunnels, a better scent vision (gold trail for the story, green for quests, an on-screen arrow, and it uncovers hidden secrets), and 12 digging spots.
- **Secrets**: a new Secrets collectible category, 10 Easter eggs, and pushable, kickable and sniffable props, doors, a TV and more.
- **Weather**: rain shortens scent vision and brings out frogs and worms, fog makes scents last longer and wisps lead to Fern Hollow. Spring showers pass through in chapter 2 and after the ending.
- **Journal**: the Quests tab tracks the main story, missions, side quests, clues, secrets and Easter eggs.

## Update: Milo's New Friend (`js/mochi.js`)

An optional story mission. From chapter 2 on, when Milo is at home during the day, Ellie brings home a second ferret, Mochi, in a pet carrier. Find her hiding place, show her around the house, find her jingle ball, share a treat, play tag in the backyard, follow her through the bush tunnel, and bring her home when she gets lost. Completing it unlocks **Best Friends**: Mochi lives in the house, naps in different spots, follows Milo when asked, plays tag and ball, sometimes finds collectibles first, and occasionally steals a treat.

## Owners, chases & The Failed Road Trip (bonus chapter)
- Ellie, Mum and Gus are fully rigged, remodelled humans with walk/run/wave/hug/lunge/carry poses.
- The family appears around the house by day. Talk to them; steal a sock or slipper and they chase you. Hide under furniture or in a bush (about 3.5 s), outrun them, or get outside to escape.
- **The Failed Road Trip**: start it from the title screen ("Road Trip") or by asking Ellie about the suitcase in the epilogue. It opens with a long cutscene (skip it with Esc or by tapping the hint). Then: escape Gus, dig under the fence, crawl through the culvert, get directions from Corvin the crow, cross the cornfield maze and slip through the hedge, then the reunion cutscene.

## Admin panel
A locked maintenance cabinet stands beside Pemberton's Corner Shop. Its code is 5683, and the code is not given anywhere in the game. The panel offers:
- Chapter skip (1–6 and the Road Trip)
- Quest and mission completion, all collectibles, all items, fast travel
- Time and weather, super speed, a chase trigger, and teleports

## Merged build: three bonus chapters
This build combines the sequel branch (chapters 6–14, Saltwhistle Bay, graphics presets, weather, credits) with the road-trip and farm branch:
- The drive to the gas station is fully animated (backing out, the highway, life in the back seat). At the gas station, a chip bag gives Milo three choices:
  - jump out: **The Failed Road Trip**
  - nap until **Grandpa Arlo's Farm** (Bonus Chapter III, `js/farm.js`)
  - stay awake for **Saltwhistle Bay** (Bonus Chapter II, `js/arlo.js`)
- The admin panel can jump to every bonus chapter.
- `trailer.html` plays a 3D trailer built on the game engine.

## Bonus Chapter IV: What Is This Place? (`js/backrooms.js`)
From chapter 2 on, a patch of the backyard fence (back left corner) flickers. Sniff it and Milo noclips into a chain of five levels, one under the other:
1. **Level 0 · The Lobby**: yellow wallpaper, damp carpet, humming lights. Odd empty rooms (a pillar hall, a room with one office chair, a room where every light is dead), a long hallway that ends in a painted-on door, and rooms with no doors at all. Find 3 bottles of almond water to light the EXIT sign. A flickering static creature walks the halls; if it catches Milo he is back where he woke up.
2. **Level 1 · The Warehouse**: concrete, puddles, stacked crates, orange lamps, grey fog. Find 4 fuses to power the freight elevator. Every ~30 s the lights flicker for 2.5 s and then go out for 6 s, and eyes open in the dark. Freeze! Moving in the dark sends Milo back to the level start (he keeps what he found).
3. **Level 2 · Pipe Dreams**: a narrow, dark maze of pipes. Milo wears a little clip-on light. Steam vents puff on a rhythm and push him back. Turn 3 valve wheels to open the floor hatch. The static creature is back, a bit slower.
4. **Level 3 · The Poolrooms**: bright white tiles, toe-deep water, deep pools (water hazards), echoing drips, no enemies. Calm refills here. Collect 5 rubber ducks to open the ladder.
5. **Level 4 · The Party That Never Ends**: streamers, confetti, cake tables. Smiling balloons drift after Milo; a balloon hug restarts the level. Pounce (jump) on 6 golden balloons and the giant cake slides aside to show the doorway home.

Also:
- **Calm meter** (HUD, Backrooms only): drains slowly, faster near the creature, blackouts or balloons, and refills in the Poolrooms. Spare almond water (a few per level, plus the Level 0 bottles) is drunk automatically when Calm is low. At 0 Milo panics and wakes at the level start.
- **Wanderer’s Notes**: 10 notes (2 per level) from Clementine, a lost hamster, in their own Collection category. Clementine herself is in Level 1 and the Poolrooms with hints.
- **Checkpoints**: going back through the fence continues from the furthest level reached. After finishing, the next visit starts a fresh run (notes are kept).
- **Scent vision (Q)** follows the maze to the next goal.
- **Admin panel**: chapter "?" enters at the checkpoint; the Backrooms group jumps to any level or resets the run.
- Nothing hurts Milo; every threat only sends him back a bit.
