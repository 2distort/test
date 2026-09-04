export type ProjectKind = 'client' | 'house'
export type RunStatus = 'draft' | 'ready' | 'running' | 'keep' | 'kill'
export type Pipe = 'higgsfield' | 'weavy' | 'figma' | 'openai' | 'anthropic'
export type RecipeId = 'still' | '15s' | 'board' | 'draft' | 'caption'
export type ProviderId = Pipe

export type Seat = {
  id: string
  name: string
}

export type Firm = {
  name: string
  seats: [Seat, Seat]
}

export type Dial = {
  id: string
  word: string
  weight: number
}

export type ModulePack = {
  id: string
  name: string
  sheet: string
  system: string
  dials: Dial[]
  locks: string[]
  recipes: Record<RecipeId, string>
}

export type RunCard = {
  beat: string
  compiled: string
  pipe: Pipe
  payerId: string
  recipe: RecipeId
  moduleId: string
  activeDials: string[]
  spend: string
  status: RunStatus
  updatedAt: string
}

export type Keep = {
  beat: string
  compiled: string
  pipe: Pipe
  recipe: RecipeId
  moduleId: string
  payerId: string
  spend: string
  at: string
}

export type Kill = {
  beat: string
  compiled: string
  note: string
  at: string
}

export type BriefNote = {
  id: string
  text: string
  at: string
  seatId: string
}

export type Room = {
  id: string
  title: string
  kind: ProjectKind
  refs: string[]
  lastKeep: Keep | null
  lastKill: Kill | null
  brief: BriefNote[]
  live: RunCard
}

export type ProviderKeys = Record<ProviderId, string>

export const PIPES: { id: Pipe; label: string }[] = [
  { id: 'higgsfield', label: 'HF' },
  { id: 'weavy', label: 'Weavy' },
  { id: 'figma', label: 'Figma' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
]

export const RECIPES: { id: RecipeId; label: string }[] = [
  { id: 'still', label: 'still' },
  { id: '15s', label: '15s' },
  { id: 'board', label: 'board' },
  { id: 'draft', label: 'draft' },
  { id: 'caption', label: 'caption' },
]

export const PROVIDERS = PIPES

export const RECIPE_IDS: RecipeId[] = ['still', '15s', 'board', 'draft', 'caption']
