import { NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  try {
    await signIn('credentials', { email, password, redirect: false })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
}
