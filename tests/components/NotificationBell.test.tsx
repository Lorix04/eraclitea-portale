import NotificationBell from "@/components/NotificationBell";
import { renderWithProviders, mockClientSession, screen, waitFor } from "../utils/test-utils";

describe("NotificationBell", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn((input: RequestInfo) => {
      const url = input.toString();
      if (url.includes("/api/notifiche/count")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ unread: 3 }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: [{ id: "1", title: "Test", isRead: false }] }),
      } as Response);
    }) as unknown as typeof fetch;
  });

  it("should show unread count badge", async () => {
    renderWithProviders(<NotificationBell />, { session: mockClientSession });

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("should not show badge when no unread", async () => {
    global.fetch = jest.fn((input: RequestInfo) => {
      const url = input.toString();
      if (url.includes("/api/notifiche/count")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ unread: 0 }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      } as Response);
    }) as unknown as typeof fetch;

    renderWithProviders(<NotificationBell />, { session: mockClientSession });

    await waitFor(() => {
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });
  });
});
