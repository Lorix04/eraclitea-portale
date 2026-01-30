import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

export const mockAdminSession = {
  user: {
    id: "admin-1",
    email: "admin@test.com",
    name: "Admin Test",
    role: "ADMIN",
    clientId: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const mockClientSession = {
  user: {
    id: "user-1",
    email: "cliente@test.com",
    name: "Cliente Test",
    role: "CLIENT",
    clientId: "client-1",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

type WrapperProps = {
  children: ReactNode;
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export function createWrapper(session: any = null) {
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: WrapperProps) {
    return (
      <SessionProvider session={session}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SessionProvider>
    );
  };
}

type CustomRenderOptions = Omit<RenderOptions, "wrapper"> & {
  session?: any;
};

export function renderWithProviders(
  ui: ReactElement,
  { session = null, ...options }: CustomRenderOptions = {}
) {
  return render(ui, {
    wrapper: createWrapper(session),
    ...options,
  });
}

export function mockFetch(data: any, status = 200) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

export function mockFetchError(message: string, status = 500) {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
  });
}

export * from "@testing-library/react";
