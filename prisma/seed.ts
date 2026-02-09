import { PrismaClient, Role, CourseStatus, RegistrationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@enteformazione.it" },
    update: {},
    create: {
      email: "admin@enteformazione.it",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log("✅ Admin:", admin.email);

  const clientiData = [
    {
      ragioneSociale: "Acme S.r.l.",
      piva: "12345678900",
      referenteNome: "Mario Rossi",
      referenteEmail: "mario@acme.it",
    },
    {
      ragioneSociale: "Beta Industries S.p.A.",
      piva: "98765432100",
      referenteNome: "Laura Bianchi",
      referenteEmail: "laura@beta.it",
    },
    {
      ragioneSociale: "Gamma Tech",
      piva: "11223344550",
      referenteNome: "Paolo Verdi",
      referenteEmail: "paolo@gamma.it",
    },
  ];

  const clients = [] as Array<{ id: string; ragioneSociale: string; piva: string }>;

  for (const clientData of clientiData) {
    const client = await prisma.client.upsert({
      where: { piva: clientData.piva },
      update: {},
      create: {
        ...clientData,
        indirizzo: "Via Roma 1, 00100 Roma",
        isActive: true,
      },
    });

    const userPassword = await bcrypt.hash("cliente123", 12);
    await prisma.user.upsert({
      where: { email: clientData.referenteEmail },
      update: {},
      create: {
        email: clientData.referenteEmail,
        passwordHash: userPassword,
        role: Role.CLIENT,
        clientId: client.id,
        isActive: true,
      },
    });

    clients.push({ id: client.id, ragioneSociale: client.ragioneSociale, piva: client.piva });
    console.log("✅ Cliente:", client.ragioneSociale);

    const employees = [
      {
        nome: "Giovanni",
        cognome: "Neri",
        codiceFiscale: `NRIGNR80A01H501A`,
      },
      {
        nome: "Anna",
        cognome: "Gialli",
        codiceFiscale: `GLLNNA85B41H501B`,
      },
      {
        nome: "Marco",
        cognome: "Blu",
        codiceFiscale: `BLUMRC90C01H501C`,
      },
    ];

    for (const employee of employees) {
      await prisma.employee.upsert({
        where: {
          clientId_codiceFiscale: {
            clientId: client.id,
            codiceFiscale: employee.codiceFiscale,
          },
        },
        update: {},
        create: {
          ...employee,
          clientId: client.id,
          dataNascita: new Date("1985-01-15"),
          luogoNascita: "Roma",
          email: `${employee.nome.toLowerCase()}.${employee.cognome.toLowerCase()}@${clientData.piva.slice(0, 5)}.it`,
        },
      });
    }
  }

  const corsiData = [
    {
      title: "Sicurezza sul Lavoro - Base",
      categories: ["Sicurezza"],
      durationHours: 8,
      editionStatus: CourseStatus.PUBLISHED,
    },
    {
      title: "Antincendio Rischio Medio",
      categories: ["Sicurezza"],
      durationHours: 6,
      editionStatus: CourseStatus.PUBLISHED,
    },
    {
      title: "Primo Soccorso Gruppo B",
      categories: ["Sicurezza"],
      durationHours: 12,
      editionStatus: CourseStatus.DRAFT,
    },
    {
      title: "GDPR e Privacy",
      categories: ["Compliance"],
      durationHours: 4,
      editionStatus: CourseStatus.PUBLISHED,
    },
    {
      title: "Leadership e Management",
      categories: ["Soft Skills"],
      durationHours: 16,
      editionStatus: CourseStatus.CLOSED,
    },
  ];

  const categoryDefinitions = [
    { name: "Sicurezza", color: "#3B82F6" },
    { name: "Compliance", color: "#10B981" },
    { name: "Soft Skills", color: "#F59E0B" },
  ];

  const categoryMap = new Map<string, string>();
  for (const category of categoryDefinitions) {
    const created = await prisma.category.upsert({
      where: { name: category.name },
      update: { color: category.color },
      create: {
        name: category.name,
        color: category.color,
      },
    });
    categoryMap.set(created.name, created.id);
  }

  const courses = [] as Array<{
    id: string;
    title: string;
    editionStatus?: CourseStatus;
  }>;

  for (const corsoData of corsiData) {
    const existing = await prisma.course.findFirst({
      where: { title: corsoData.title },
    });

    const course = existing
      ? await prisma.course.update({
          where: { id: existing.id },
          data: {
            durationHours: corsoData.durationHours,
            description: `Corso di formazione ${corsoData.title}. Durata ${corsoData.durationHours ?? 8} ore.`,
          },
        })
      : await prisma.course.create({
          data: {
            title: corsoData.title,
            durationHours: corsoData.durationHours,
            description: `Corso di formazione ${corsoData.title}. Durata ${corsoData.durationHours ?? 8} ore.`,
          },
        });

    const categoryIds = corsoData.categories
      .map((name) => categoryMap.get(name))
      .filter(Boolean) as string[];
    if (categoryIds.length) {
      await prisma.courseCategory.deleteMany({ where: { courseId: course.id } });
      await prisma.courseCategory.createMany({
        data: categoryIds.map((categoryId) => ({
          courseId: course.id,
          categoryId,
        })),
      });
    }

    courses.push({
      id: course.id,
      title: course.title,
      editionStatus: corsoData.editionStatus,
    });
    console.log("✅ Corso:", course.title);
  }

  const publishedCourse = courses.find(
    (course) => course.editionStatus === CourseStatus.PUBLISHED
  );
  const editionsByClient = new Map<string, { id: string }>();
  if (publishedCourse) {
    for (const client of clients) {
      const existingEdition = await prisma.courseEdition.findFirst({
        where: {
          courseId: publishedCourse.id,
          clientId: client.id,
          editionNumber: 1,
        },
        select: { id: true },
      });

      const edition =
        existingEdition ??
        (await prisma.courseEdition.create({
          data: {
            courseId: publishedCourse.id,
            clientId: client.id,
            editionNumber: 1,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            deadlineRegistry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: CourseStatus.PUBLISHED,
          },
          select: { id: true },
        }));

      editionsByClient.set(client.id, edition);

      const employees = await prisma.employee.findMany({
        where: { clientId: client.id },
        take: 2,
      });

      for (const employee of employees) {
        await prisma.courseRegistration.upsert({
          where: {
            courseEditionId_employeeId: {
              courseEditionId: edition.id,
              employeeId: employee.id,
            },
          },
          update: { status: RegistrationStatus.CONFIRMED },
          create: {
            clientId: client.id,
            courseEditionId: edition.id,
            employeeId: employee.id,
            status: RegistrationStatus.CONFIRMED,
          },
        });
      }
    }
  }

  const firstClient = clients[0];
  const firstEdition = firstClient ? editionsByClient.get(firstClient.id) : null;
  if (firstClient && firstEdition) {
    const employee = await prisma.employee.findFirst({
      where: { clientId: firstClient.id },
    });
    if (employee) {
      const existingCert = await prisma.certificate.findFirst({
        where: {
          clientId: firstClient.id,
          courseEditionId: firstEdition.id,
          employeeId: employee.id,
        },
      });
      if (!existingCert) {
        await prisma.certificate.create({
          data: {
            clientId: firstClient.id,
            courseEditionId: firstEdition.id,
            employeeId: employee.id,
            filePath: "./storage/certificates/demo/attestato_demo.pdf",
            achievedAt: new Date(),
            expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            uploadedBy: admin.id,
          },
        });
      }
    }
  }

  for (const [index, client] of clients.entries()) {
    const categoryId = categoryDefinitions[index % categoryDefinitions.length]
      ? categoryMap.get(categoryDefinitions[index % categoryDefinitions.length].name)
      : null;
    if (categoryId) {
      await prisma.clientCategory.upsert({
        where: { clientId_categoryId: { clientId: client.id, categoryId } },
        update: {},
        create: { clientId: client.id, categoryId },
      });
    }
  }

  console.log("🎉 Seeding completato!");
  console.log("\n📋 Credenziali demo:");
  console.log("   Admin: admin@enteformazione.it / admin123");
  console.log("   Cliente: mario@acme.it / cliente123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
