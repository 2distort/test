# Two Seat (firm-desk)

Local-first desk for a two-person AI creative firm. Open it and make the next unit — still, 15s, or cut note — without leaving the picture.

v1 is front end only. Generation stays in Higgsfield / Weavy / Figma / a text model. This desk holds the live room, the next prompt, who spends, and the keep/kill trail as markdown in a linked folder.

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
  index.md      room index
  log.md        keep / kill trail
  state.md      firm name, seats, live room
  rooms/*.md    one file per room
```

The folder is the sync. The other seat — and an LLM tomorrow — reads the same files. Provider keys never leave this browser (`localStorage`).

You are whoever this machine is. Set the active seat in **set**. There is no seat gate.

## Five jobs

1. **See the live room** — title, refs, last keep, last kill.
2. **Write the next prompt** on top of those refs.
3. **Name who spends and which pipe** — HF / Weavy / Figma / text, plus still · 15s · cut.
4. **Mark running / keep / kill**.
5. **Land it as markdown** in the linked folder.

If a screen does not help one of those five, it does not ship.

## Layout

```
[ last keep / ref still ]     [ next prompt ]
                              [ via · who pays · file ]
[ last kill, one line ]       [ keep | kill ]
[ brief thread, collapsed ]
```

Rooms are shots, not module tiles. Client vs house is a kind on the room. Keys and seat names live in a quiet settings drawer.
