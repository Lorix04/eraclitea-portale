import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { QueryProvider } from '@/components/providers/query-provider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <QueryProvider>
      <div className="min-h-screen bg-[#f5f7fa]">
        <Sidebar user={session.user as any} />
        <div className="lg:pl-[220px] flex min-h-screen flex-col">
          <Header user={session.user as any} />
          <main className="flex-1 p-6">{children}</main>
          <Footer />
        </div>
      </div>
    </QueryProvider>
  )
}
