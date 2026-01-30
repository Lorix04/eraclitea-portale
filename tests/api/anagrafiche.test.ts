/** @jest-environment node */
import { POST } from "@/app/api/anagrafiche/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

describe("API /api/anagrafiche", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/anagrafiche", () => {
    it("should save employees and create registrations", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", role: "CLIENT", clientId: "client-1" },
      } as any);

      (prisma.employee.upsert as jest.Mock).mockResolvedValue({
        id: "emp-1",
        nome: "Mario",
        cognome: "Rossi",
        codiceFiscale: "RSSMRA80A01H501U",
      });

      (prisma.courseRegistration.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      const request = new Request("http://localhost/api/anagrafiche", {
        method: "POST",
        body: JSON.stringify({
          courseId: "course-1",
          employees: [
            {
              nome: "Mario",
              cognome: "Rossi",
              codiceFiscale: "RSSMRA80A01H501U",
              dataNascita: "15/03/1980",
              luogoNascita: "Roma",
              email: "mario@test.com",
            },
          ],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.saved).toBe(1);
    });

    it("should handle invalid Italian date format", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", role: "CLIENT", clientId: "client-1" },
      } as any);

      const request = new Request("http://localhost/api/anagrafiche", {
        method: "POST",
        body: JSON.stringify({
          courseId: "course-1",
          employees: [
            {
              nome: "Mario",
              cognome: "Rossi",
              codiceFiscale: "RSSMRA80A01H501U",
              dataNascita: "invalid-date",
            },
          ],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.errors).toBeDefined();
      expect(data.errors[0].field).toBe("dataNascita");
    });
  });
});
