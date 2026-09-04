import { RECIPES } from '../types'
import { useDesk } from '../store'

export function ModuleBar() {
  const { modules, room, setModule, setRecipe } = useDesk()
  if (!room) return null

  return (
    <div className="cell-pad module-bar">
      <div className="meta-group">
        <span className="label">module</span>
        {modules.map((m) => (
          <button
            key={m.id}
            type="button"
            className={room.live.moduleId === m.id ? 'is-on' : ''}
            onClick={() => setModule(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="meta-group">
        <span className="label">recipe</span>
        {RECIPES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={room.live.recipe === r.id ? 'is-on' : ''}
            onClick={() => setRecipe(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  )
}
