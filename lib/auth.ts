import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'

import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e password richiesti')
        }

        const email = String(credentials.email).toLowerCase()
        const user = await prisma.user.findUnique({
          where: { email },
          include: { client: true },
        })

        if (!user || !user.isActive) {
          throw new Error('Utente non trovato o disattivato')
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        )

        if (!isValidPassword) {
          throw new Error('Password non valida')
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          clientId: user.clientId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.clientId = (user as any).clientId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.clientId = token.clientId as string | null
      }
      return session
    },
  },
})
