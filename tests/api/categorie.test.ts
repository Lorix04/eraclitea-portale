/** @jest-environment node */
import { GET, POST } from "@/app/api/admin/categorie/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

describe("API /api/admin/categorie", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/categorie", () => {
    it("should return 401 for non-admin users", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "CLIENT", clientId: "c1" },
      } as any);

      const request = new Request("http://localhost/api/admin/categorie");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return categories list for admin", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN" },
      } as any);

      const mockCategories = [
        {
          id: "cat-1",
          name: "Sicurezza",
          color: "#FF0000",
          _count: { courses: 2, clients: 5 },
        },
        {
          id: "cat-2",
          name: "Ambiente",
          color: "#00FF00",
          _count: { courses: 1, clients: 3 },
        },
      ];

      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const request = new Request("http://localhost/api/admin/categorie");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe("Sicurezza");
    });
  });

  describe("POST /api/admin/categorie", () => {
    it("should create a new category", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN" },
      } as any);

      (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.category.create as jest.Mock).mockResolvedValue({
        id: "cat-new",
        name: "Nuova Categoria",
        description: "Descrizione test",
        color: "#3B82F6",
        _count: { courses: 0, clients: 0 },
      });

      const request = new Request("http://localhost/api/admin/categorie", {
        method: "POST",
        body: JSON.stringify({
          name: "Nuova Categoria",
          description: "Descrizione test",
          color: "#3B82F6",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.name).toBe("Nuova Categoria");
    });

    it("should reject duplicate category name", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN" },
      } as any);

      (prisma.category.findUnique as jest.Mock).mockResolvedValue({
        id: "existing",
        name: "Sicurezza",
      });

      const request = new Request("http://localhost/api/admin/categorie", {
        method: "POST",
        body: JSON.stringify({ name: "Sicurezza" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("categoria");
    });

    it("should reject invalid data", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN" },
      } as any);

      const request = new Request("http://localhost/api/admin/categorie", {
        method: "POST",
        body: JSON.stringify({
          name: "",
          color: "invalid-color",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
