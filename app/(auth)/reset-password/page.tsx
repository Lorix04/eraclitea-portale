"use client"
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function ResetPasswordPage() {
  const params = useSearchParams()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
    if (res.ok) setDone(true)
  }
  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <div className="w-full max-w-md bg-white shadow rounded p-6">
        <h1 className="text-xl font-semibold mb-4">Imposta nuova password</h1>
        {done ? (
          <p className="text-sm">Password aggiornata. <a className="text-accent" href="/login">Accedi</a></p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nuova password</label>
              <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            </div>
            <button className="w-full bg-primary text-white rounded py-2 hover:bg-primary-light transition">Salva</button>
          </form>
        )}
      </div>
    </div>
  )
}
