import { createMocks } from 'node-mocks-http'
import { GET } from '@/app/api/admin/courses/route'

jest.mock('@/lib/prisma', () => ({ prisma: { course: { findMany: jest.fn(), count: jest.fn() } } }))
jest.mock('@/lib/auth', () => ({ auth: jest.fn(() => Promise.resolve({ user: { id: '1', role: 'ADMIN' } })) }))

describe('GET /api/admin/courses', () => {
  it('returns paginated courses', async () => {
    const { prisma } = require('@/lib/prisma')
    prisma.course.findMany.mockResolvedValue([{ id: '1', title: 'Test Course', status: 'PUBLISHED', _count: { registrations: 0 } }])
    prisma.course.count.mockResolvedValue(1)

    const { req } = createMocks({ method: 'GET', url: 'http://localhost/api/admin/courses?page=1&limit=10' })
    // @ts-ignore
    const res = await GET(req)
    const data = await res.json()
    expect(data.total).toBe(1)
    expect(data.data).toHaveLength(1)
  })
})
