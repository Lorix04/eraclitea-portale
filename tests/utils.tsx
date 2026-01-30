import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import type { ReactElement } from "react";
import type { Session } from "next-auth";

const mockSession: Session = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    role: "CLIENT",
    clientId: "test-client-id",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

const mockAdminSession: Session = {
  user: {
    id: "admin-user-id",
    email: "admin@example.com",
    role: "ADMIN",
    clientId: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  session?: Session | null;
}

function customRender(
  ui: ReactElement,
  { session = mockSession, ...options }: CustomRenderOptions = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SessionProvider session={session}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SessionProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react";
export { customRender as render, mockSession, mockAdminSession };
