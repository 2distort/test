# Two Seat (firm-desk)

Local-first BYOK desk for a two-person AI creative firm. Open it, pick a module and a recipe, write the beat, read the compiled draft, keep or kill.

v1 is front end only. Providers are pipes under modules. Keys stay in `localStorage`. The linked folder is memory.

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Needs a Chromium browser (Chrome, Edge, Arc). The desk writes the vault through the File System Access API.

In `npm run dev` only, `?mem=1` skips the folder picker so you can click the surface. It does not write a vault.

## Vault

On first open, use **open vault** and pick the local folder (an Obsidian vault is fine). The desk writes under `desk/`:

```
desk/
  index.md
  log.md
  state.md
  rooms/*.md
  modules/<id>/
    sheet.md
    system.md
    dials.json
    locks/
    recipes/
    keeps.md
```

The folder is the sync. Provider keys never leave this browser.

You are whoever this machine is. Set the active seat in **set**. There is no seat gate.

## Modules

A module is a fidelity pack, not a theme kit. One module at a time — packs do not mix. Dials are that module’s words. Weights move on keep / kill.

Stub modules shipped: `2distort` and `trio` (house, internal). `client-starter` is the sold template — replace placeholders with the client's words and locks before FIRE. Locks are placeholder paths.

## Recipes

`still` · `15s` · `board` · `draft` · `caption`

Pipes (BYOK, quiet drawer): Higgsfield · Weavy · Figma · OpenAI · Anthropic

## Compiler

Write the beat only. The compiler injects sheet + system.md + active dials + recipe + locked refs. The exact draft is on the surface before you mark running. Keep / kill is on that artifact.

## Layout

```
[ module chip · recipe ] [ last keep / ref ]
[ dials from THIS module ] [ next prompt ]
[ via · who pays · spend ] [ keep | kill ]
[ compiled draft ]
[ brief thread, collapsed ]
```

Rooms are shots. Client vs house is a kind on the room.
