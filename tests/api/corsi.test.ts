/** @jest-environment node */
import { GET, POST } from "@/app/api/corsi/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

describe("/api/corsi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: "admin-id", role: "ADMIN" },
    } as any);
  });

  describe("GET", () => {
    it("should return courses list", async () => {
      const mockCourses = [
        { id: "1", title: "Corso 1", activeEditions: 0, editions: [] },
        { id: "2", title: "Corso 2", activeEditions: 0, editions: [] },
      ];

      (prisma.course.findMany as jest.Mock).mockResolvedValue(mockCourses);

      const request = new Request("http://localhost/api/corsi");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockCourses);
    });

    it("should filter by visibilityType", async () => {
      (prisma.course.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/corsi?visibilityType=PUBLIC"
      );
      await GET(request);

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ visibilityType: "ALL" }),
        })
      );
    });
  });

  describe("POST", () => {
    it("should create a new course", async () => {
      const newCourse = {
        title: "Nuovo Corso",
        description: "Descrizione",
      };

      (prisma.course.create as jest.Mock).mockResolvedValue({
        id: "new-id",
        ...newCourse,
        status: "DRAFT",
        visibility: [],
      });

      const request = new Request("http://localhost/api/corsi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCourse),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.title).toBe(newCourse.title);
      expect(data.data.status).toBe("DRAFT");
    });

    it("should reject missing title", async () => {
      const request = new Request("http://localhost/api/corsi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Solo descrizione" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
