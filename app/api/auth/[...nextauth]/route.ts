import { handlers } from '@/lib/auth'

const withEnvFix =
  (handler: typeof handlers.GET) =>
  async (req: Request) => {
    const shouldFix = process.env.NODE_ENV !== 'production'
    const prevNextAuthUrl = process.env.NEXTAUTH_URL
    const prevAuthUrl = process.env.AUTH_URL

    if (shouldFix) {
      delete process.env.NEXTAUTH_URL
      delete process.env.AUTH_URL
    }

    try {
      return await handler(req as any)
    } finally {
      if (shouldFix) {
        if (prevNextAuthUrl !== undefined) {
          process.env.NEXTAUTH_URL = prevNextAuthUrl
        }
        if (prevAuthUrl !== undefined) {
          process.env.AUTH_URL = prevAuthUrl
        }
      }
    }
  }

export const GET = withEnvFix(handlers.GET)
export const POST = withEnvFix(handlers.POST)
