import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await prisma.course.findUnique({
    where: { id: params.id },
    select: { title: true, description: true },
  });

  if (!course) {
    return { title: "Corso non trovato" };
  }

  return {
    title: course.title,
    description: course.description || `Dettagli del corso ${course.title}`,
  };
}

export default function CourseDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
