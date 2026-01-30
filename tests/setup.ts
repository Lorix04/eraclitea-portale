import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: "unauthenticated",
  })),
  SessionProvider: ({ children }: { children: any }) => children,
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    certificate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    courseCategory: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    clientCategory: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    courseVisibility: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    courseVisibilityCategory: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    courseRegistration: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: any) => unknown) =>
      fn({
        course: { update: jest.fn() },
        courseCategory: { deleteMany: jest.fn(), createMany: jest.fn() },
        courseVisibility: { deleteMany: jest.fn(), createMany: jest.fn() },
        courseVisibilityCategory: { deleteMany: jest.fn(), createMany: jest.fn() },
        clientCategory: { deleteMany: jest.fn(), createMany: jest.fn() },
      })
    ),
  },
}));

jest.mock("@/lib/audit", () => ({
  logAudit: jest.fn(),
  getClientIP: jest.fn(() => "test"),
}));

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
