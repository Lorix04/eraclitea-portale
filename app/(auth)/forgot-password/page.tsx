"use client"
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    if (res.ok) setSent(true)
  }
  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <div className="w-full max-w-md bg-white shadow rounded p-6">
        <h1 className="text-xl font-semibold mb-4">Recupero password</h1>
        {sent ? (
          <p className="text-sm">Se l&apos;indirizzo esiste, riceverai una email con le istruzioni.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input className="w-full border rounded px-3 py-2" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            </div>
            <button className="w-full bg-primary text-white rounded py-2 hover:bg-primary-light transition">Invia</button>
          </form>
        )}
      </div>
    </div>
  )
}
