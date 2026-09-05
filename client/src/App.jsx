import { useEffect, useState } from 'react'

export default function App() {
  const [health, setHealth] = useState({ state: 'checking' })

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`API responded ${res.status}`)
        return res.json()
      })
      .then((data) => setHealth({ state: 'ok', data }))
      .catch((err) => setHealth({ state: 'error', message: err.message }))
  }, [])

  return (
    <main className="shell">
      <h1>PeoplePay360</h1>
      <p className="tagline">HR &amp; Payroll operations</p>

      <section className="status">
        <h2>API connection</h2>

        {health.state === 'checking' && <p>Checking…</p>}

        {health.state === 'ok' && (
          <dl>
            <div>
              <dt>Service</dt>
              <dd>{health.data.service}</dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd>{health.data.ok ? 'connected' : 'not connected'}</dd>
            </div>
            <div>
              <dt>Uptime</dt>
              <dd>{health.data.uptime}s</dd>
            </div>
          </dl>
        )}

        {health.state === 'error' && (
          <p className="error">
            {health.message} — start the API with <code>npm run dev</code> in <code>server/</code>.
          </p>
        )}
      </section>
    </main>
  )
}
