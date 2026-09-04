import { useDesk } from '../store'

export function OpenVault() {
  const { gate, fsOk, openVault, vaultName } = useDesk()

  if (gate === 'checking') {
    return <main className="surface" />
  }

  if (!fsOk || gate === 'blocked') {
    return (
      <main className="surface">
        <div className="gate">
          <div className="gate-card">
            <p>Chromium required — this desk writes a local folder.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="surface">
      <div className="gate">
        <div className="gate-card">
          {vaultName ? <p>re-open {vaultName}</p> : null}
          <button type="button" onClick={() => void openVault()}>
            open vault
          </button>
        </div>
      </div>
    </main>
  )
}
