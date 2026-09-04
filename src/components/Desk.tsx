import { useDesk } from '../store'
import { BeatPane } from './BeatPane'
import { BriefThread } from './BriefThread'
import { CompilerDraft } from './CompilerDraft'
import { DialBoard } from './DialBoard'
import { KeepStill } from './KeepStill'
import { KillLine } from './KillLine'
import { ModuleBar } from './ModuleBar'
import { OpenVault } from './OpenVault'
import { RoomStrip } from './RoomStrip'
import { RunMeta } from './RunMeta'
import { SettingsDrawer } from './SettingsDrawer'
import { Verdict } from './Verdict'
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
          <section className="cell cell-module">
            <ModuleBar />
          </section>
          <section className="cell cell-keep">
            <KeepStill />
            <KillLine />
          </section>
          <section className="cell cell-dials">
            <DialBoard />
          </section>
          <section className="cell cell-beat">
            <BeatPane />
          </section>
          <section className="cell cell-meta">
            <RunMeta />
          </section>
          <section className="cell cell-verdict">
            <Verdict />
          </section>
          <section className="cell cell-draft">
            <CompilerDraft />
          </section>
          <section className="cell cell-brief">
            <BriefThread />
          </section>
        </main>
      )}

      {desk.settingsOpen ? <SettingsDrawer /> : null}
    </div>
  )
}
