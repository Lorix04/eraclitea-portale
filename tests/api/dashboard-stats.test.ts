/** @jest-environment node */
import { GET } from "@/app/api/dashboard/stats/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

describe("API /api/dashboard/stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return client statistics", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", role: "CLIENT", clientId: "client-1" },
    } as any);

    (prisma.employee.count as jest.Mock).mockResolvedValue(10);
    (prisma.certificate.count as jest.Mock)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    (prisma.courseRegistration.count as jest.Mock).mockResolvedValue(3);
    (prisma.courseRegistration.findMany as jest.Mock).mockResolvedValue([
      { courseId: "course-1" },
      { courseId: "course-2" },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.totalEmployees).toBe(10);
    expect(data.totalCertificates).toBe(5);
    expect(data.coursesCompleted).toBe(2);
    expect(data.expiringCerts).toBe(2);
  });

  it("should reject non-client users", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    } as any);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("should handle missing clientId", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", role: "CLIENT", clientId: null },
    } as any);

    const response = await GET();

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("ClientId");
  });
});
