import { useDesk } from '../store'
import { BriefThread } from './BriefThread'
import { KeepStill } from './KeepStill'
import { KillLine } from './KillLine'
import { OpenVault } from './OpenVault'
import { PromptPane } from './PromptPane'
import { RoomStrip } from './RoomStrip'
import { SettingsDrawer } from './SettingsDrawer'
import { shortStamp } from '../time'

export function Desk() {
  const desk = useDesk()
  const seat = desk.firm.seats.find((s) => s.id === desk.thisSeatId)

  return (
    <div className="desk">
      <header className="chrome">
        <div className="brand">
          <span className="brand-name">{desk.firm.name}</span>
          {desk.vaultName ? <span className="brand-vault">{desk.vaultName}</span> : null}
        </div>
        {desk.gate === 'ready' ? <RoomStrip /> : <div className="rooms" />}
        <div className="chrome-right">
          {desk.writeError ? <span className="write-err">{desk.writeError}</span> : null}
          {desk.lastWriteAt && !desk.writeError ? (
            <span className="write-ok">{shortStamp(desk.lastWriteAt)}</span>
          ) : null}
          <span>{seat?.name ?? 'seat'}</span>
          <button type="button" onClick={() => desk.setSettingsOpen(true)}>
            set
          </button>
        </div>
      </header>

      {desk.gate !== 'ready' ? (
        <OpenVault />
      ) : (
        <main className="surface">
          <section className="col col-left">
            <KeepStill />
            <KillLine />
            <BriefThread />
          </section>
          <section className="col col-right">
            <PromptPane />
          </section>
        </main>
      )}

      {desk.settingsOpen ? <SettingsDrawer /> : null}
    </div>
  )
}
