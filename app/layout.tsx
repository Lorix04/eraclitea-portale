import './globals.css'
import { ReactNode } from 'react'

import QueryProvider from '@/components/providers/query-provider'
import SessionProvider from '@/components/providers/session-provider'

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'Portale Formazione',
  description: 'Portale Clienti per Ente di Formazione',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen text-text-primary">
        <SessionProvider>
          <QueryProvider>{children}</QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
