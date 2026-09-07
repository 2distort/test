import type { ModulePack, RecipeId } from '../types'

const STILL: RecipeId = 'still'

const SHARED_RECIPES_NOTE = {
  still: 'Single frame. Hold the lock. No extra figures. Do not invent a face.',
  '15s': 'One motion. Hold the lock. Cut on the change. Do not invent a face.',
  board: 'Six frames. Same lock throughout. No new figures.',
  draft: 'Text pass. The beat is the only new sentence. No polish pass.',
  caption: 'One line under the frame. The beat, not a pitch.',
} as const

export const MODULE_2DISTORT: ModulePack = {
  id: '2distort',
  name: '2distort',
  sheet: `# 2distort

Still-first. Grain sits on the light, not on the face.
One lock per frame. Camera is close and a little wrong.
Color: warm black, sick green, sodium.
`,
  system: `# system

Use only this module. Do not invent faces.
Hold every path in locks/.
The user beat is the only new sentence.
Return one artifact for the active recipe.
`,
  dials: [
    { id: 'whimsical', word: 'whimsical', weight: 0.55 },
    { id: 'eerie', word: 'eerie', weight: 0.6 },
    { id: 'tender', word: 'tender', weight: 0.4 },
    { id: 'sharp', word: 'sharp', weight: 0.45 },
  ],
  locks: ['desk/modules/2distort/locks/hero-still.png', 'desk/modules/2distort/locks/grade-ref.png'],
  recipes: {
    still: `# still

${SHARED_RECIPES_NOTE.still}
Close crop. Grain on the light.`,
    '15s': `# 15s

${SHARED_RECIPES_NOTE['15s']}
One lean in. Hold.`,
    board: `# board

${SHARED_RECIPES_NOTE.board}
Same grade on every cell.`,
    draft: `# draft

${SHARED_RECIPES_NOTE.draft}`,
    caption: `# caption

${SHARED_RECIPES_NOTE.caption}`,
  },
}

export const MODULE_TRIO: ModulePack = {
  id: 'trio',
  name: 'trio',
  sheet: `# trio

Wider lens. Drier light. No solo hero crop unless the lock says so.
Three seats in frame only when a lock path is present.
Keep the pack closed — do not mix another module.
`,
  system: `# system

Use only this module. Do not invent faces.
Hold every path in locks/.
The user beat is the only new sentence.
Return one artifact for the active recipe.
`,
  dials: [
    { id: 'dry', word: 'dry', weight: 0.55 },
    { id: 'chorus', word: 'chorus', weight: 0.5 },
    { id: 'off-axis', word: 'off-axis', weight: 0.45 },
    { id: 'tight', word: 'tight', weight: 0.6 },
  ],
  locks: ['desk/modules/trio/locks/three-shot.png', 'desk/modules/trio/locks/wide-lock.png'],
  recipes: {
    still: `# still

${SHARED_RECIPES_NOTE.still}
Wider than a hero card.`,
    '15s': `# 15s

${SHARED_RECIPES_NOTE['15s']}
Group hold. No push-in on one face.`,
    board: `# board

${SHARED_RECIPES_NOTE.board}
Three-up, then six. Same lock.`,
    draft: `# draft

${SHARED_RECIPES_NOTE.draft}`,
    caption: `# caption

${SHARED_RECIPES_NOTE.caption}`,
  },
}

export const MODULE_CLIENT_STARTER: ModulePack = {
  id: 'client-starter',
  name: 'client-starter',
  sheet: `# client-starter

Sold client pack. Placeholders only — replace with their words and locks before FIRE.
Still-first. Pilot is still, board, caption.
Do not mix with house packs.
`,
  system: `# system

Use only this module. Do not invent faces.
Never pull 2distort or trio locks.
Client IP stays in this folder.
Hold every path in locks/.
The user beat is the only new sentence.
Return one artifact for the active recipe.
`,
  dials: [
    { id: 'brand-red', word: 'brand-red', weight: 0.55 },
    { id: 'clean', word: 'clean', weight: 0.6 },
    { id: 'loud', word: 'loud', weight: 0.4 },
    { id: 'quiet', word: 'quiet', weight: 0.45 },
  ],
  locks: [
    'desk/modules/client-starter/locks/hero-still.png',
    'desk/modules/client-starter/locks/grade-ref.png',
  ],
  recipes: {
    still: `# still

${SHARED_RECIPES_NOTE.still}
Pilot recipe. Hold their lock.`,
    '15s': `# 15s

${SHARED_RECIPES_NOTE['15s']}
Still first / optional.`,
    board: `# board

${SHARED_RECIPES_NOTE.board}
Pilot recipe. Same client lock on every cell.`,
    draft: `# draft

${SHARED_RECIPES_NOTE.draft}`,
    caption: `# caption

${SHARED_RECIPES_NOTE.caption}
Pilot recipe.`,
  },
}

export const STUB_MODULES: ModulePack[] = [MODULE_2DISTORT, MODULE_TRIO, MODULE_CLIENT_STARTER]

export const DEFAULT_MODULE_ID = MODULE_2DISTORT.id
export const DEFAULT_RECIPE: RecipeId = STILL

export function defaultActiveDials(pack: ModulePack): string[] {
  return pack.dials.filter((d) => d.weight >= 0.5).map((d) => d.id)
}

export function findPack(modules: ModulePack[], id: string): ModulePack {
  return modules.find((m) => m.id === id) ?? modules[0] ?? MODULE_2DISTORT
}
