import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState('Checking API...')
  const [message, setMessage] = useState('Loading backend message...')

  useEffect(() => {
    const loadApiData = async () => {
      try {
        const [healthResponse, messageResponse] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/message'),
        ])

        if (!healthResponse.ok || !messageResponse.ok) {
          throw new Error('API request failed')
        }

        const healthJson = await healthResponse.json()
        const messageJson = await messageResponse.json()

        setHealth(`${healthJson.status.toUpperCase()} · ${healthJson.service}`)
        setMessage(messageJson.message)
      } catch (_error) {
        setHealth('API unavailable')
        setMessage('Start the backend with `npm run dev:server` to enable endpoints.')
      }
    }

    loadApiData()
  }, [])

  return (
    <main className="app">
      <header className="hero">
        <p className="badge">Hackathon Starter</p>
        <h1>React + Node.js in one workspace</h1>
        <p className="subtitle">
          Use this scaffold to build quickly: frontend in <code>client</code>, backend in <code>server</code>.
        </p>
      </header>

      <section className="status-grid">
        <article className="card">
          <h2>API Health</h2>
          <p>{health}</p>
        </article>
        <article className="card">
          <h2>Backend Message</h2>
          <p>{message}</p>
        </article>
      </section>

      <section className="card steps">
        <h2>Quick Start</h2>
        <ol>
          <li>Run <code>npm run dev</code> at the project root.</li>
          <li>Open <code>http://localhost:5173</code> for the React app.</li>
          <li>Build your features on <code>/api</code> routes in the server.</li>
        </ol>
      </section>
    </main>
  )
}

export default App
