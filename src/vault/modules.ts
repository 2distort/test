import { STUB_MODULES } from '../modules/stubs'
import { RECIPE_IDS, type ModulePack, type RecipeId } from '../types'

export const MODULES_DIR = 'modules'

type FsDir = FileSystemDirectoryHandle

async function getDir(root: FsDir, name: string, create = true): Promise<FsDir> {
  return root.getDirectoryHandle(name, { create })
}

async function writeFile(parent: FsDir, name: string, text: string): Promise<void> {
  const file = await parent.getFileHandle(name, { create: true })
  const writable = await file.createWritable()
  await writable.write(text)
  await writable.close()
}

async function readFile(parent: FsDir, name: string): Promise<string | null> {
  try {
    const file = await parent.getFileHandle(name)
    return (await file.getFile()).text()
  } catch {
    return null
  }
}

function withNl(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`
}

function serializeDials(pack: ModulePack): string {
  return `${JSON.stringify({ dials: pack.dials }, null, 2)}\n`
}

function parseDials(raw: string, fallback: ModulePack['dials']): ModulePack['dials'] {
  try {
    const parsed = JSON.parse(raw) as { dials?: ModulePack['dials'] }
    if (!Array.isArray(parsed.dials)) return fallback
    return parsed.dials
      .filter((d) => d && typeof d.id === 'string' && typeof d.word === 'string')
      .map((d) => ({
        id: d.id,
        word: d.word,
        weight: typeof d.weight === 'number' ? Math.min(1, Math.max(0, d.weight)) : 0.5,
      }))
  } catch {
    return fallback
  }
}

function lockFileName(path: string): string {
  const base = path.split('/').pop() || 'lock'
  return base.endsWith('.md') ? base : `${base}.md`
}

async function writePack(modulesDir: FsDir, pack: ModulePack): Promise<void> {
  const dir = await getDir(modulesDir, pack.id)
  await writeFile(dir, 'sheet.md', withNl(pack.sheet))
  await writeFile(dir, 'system.md', withNl(pack.system))
  await writeFile(dir, 'dials.json', serializeDials(pack))
  const locks = await getDir(dir, 'locks')
  for (const lockPath of pack.locks) {
    await writeFile(locks, lockFileName(lockPath), `path: ${lockPath}\n`)
  }
  const recipes = await getDir(dir, 'recipes')
  for (const id of RECIPE_IDS) {
    await writeFile(recipes, `${id}.md`, withNl(pack.recipes[id] ?? id))
  }
}

async function readPack(modulesDir: FsDir, stub: ModulePack): Promise<ModulePack | null> {
  try {
    const dir = await getDir(modulesDir, stub.id, false)
    const sheet = await readFile(dir, 'sheet.md')
    if (sheet === null) return null
    const system = (await readFile(dir, 'system.md')) ?? stub.system
    const dialsRaw = await readFile(dir, 'dials.json')
    const recipes: ModulePack['recipes'] = { ...stub.recipes }
    try {
      const recipesDir = await getDir(dir, 'recipes', false)
      for (const id of RECIPE_IDS) {
        const text = await readFile(recipesDir, `${id}.md`)
        if (text) recipes[id] = text
      }
    } catch {
      /* stub recipes */
    }
    return {
      ...stub,
      sheet,
      system,
      dials: dialsRaw ? parseDials(dialsRaw, stub.dials) : stub.dials,
      recipes,
      locks: stub.locks,
    }
  } catch {
    return null
  }
}

export async function ensureModules(desk: FsDir): Promise<ModulePack[]> {
  const modulesDir = await getDir(desk, MODULES_DIR)
  const packs: ModulePack[] = []
  for (const stub of STUB_MODULES) {
    const existing = await readPack(modulesDir, stub)
    if (existing) {
      packs.push(existing)
    } else {
      await writePack(modulesDir, stub)
      packs.push(stub)
    }
  }
  return packs
}

export async function writeModuleDials(desk: FsDir, pack: ModulePack): Promise<void> {
  const modulesDir = await getDir(desk, MODULES_DIR)
  const dir = await getDir(modulesDir, pack.id)
  await writeFile(dir, 'dials.json', serializeDials(pack))
}

export async function appendModuleKeep(desk: FsDir, pack: ModulePack, compiled: string, at: string): Promise<void> {
  const modulesDir = await getDir(desk, MODULES_DIR)
  const dir = await getDir(modulesDir, pack.id)
  const prev = (await readFile(dir, 'keeps.md')) ?? '# keeps\n\n'
  await writeFile(dir, 'keeps.md', `${prev.trimEnd()}\n\n## ${at}\n\n${compiled.trim()}\n`)
}

export function recipeFromUnknown(value: string | undefined): RecipeId {
  if (value && (RECIPE_IDS as string[]).includes(value)) return value as RecipeId
  if (value === 'cut') return 'still'
  return 'still'
}
