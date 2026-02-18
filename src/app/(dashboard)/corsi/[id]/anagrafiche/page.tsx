import { redirect } from "next/navigation";

export default function AnagrafichePage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/corsi/${params.id}`);
}
