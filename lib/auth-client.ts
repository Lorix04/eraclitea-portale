import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function requireClient() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if ((session.user as any).role !== 'CLIENT') redirect('/admin')
  if (!(session.user as any).clientId) throw new Error('Client ID mancante')
  return { userId: (session.user as any).id, clientId: (session.user as any).clientId, email: session.user.email as string }
}

export async function getClientContext() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'CLIENT' || !(session.user as any).clientId) return null
  return { userId: (session.user as any).id, clientId: (session.user as any).clientId }
}
