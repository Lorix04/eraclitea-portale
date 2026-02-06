import { prisma } from "../src/lib/prisma";

async function migrateEmployees() {
  const [employeeCount, registrationCount] = await Promise.all([
    prisma.employee.count(),
    prisma.courseRegistration.count(),
  ]);

  console.log(
    `Dipendenti presenti: ${employeeCount}, registrazioni corsi: ${registrationCount}.`
  );
  console.log(
    "Lo schema attuale salva direttamente employeeId nelle registrazioni."
  );
  console.log(
    "Se hai dati legacy senza employeeId, aggiorna manualmente i record."
  );
}

migrateEmployees()
  .catch((error) => {
    console.error("Errore migrazione dipendenti:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
