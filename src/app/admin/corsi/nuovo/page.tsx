import CourseForm from "@/components/CourseForm";

export default function AdminNuovoCorsoPage() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h1 className="text-xl font-semibold">Nuovo corso</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Crea un nuovo corso e definisci la visibilita.
      </p>
      <div className="mt-6">
        <CourseForm />
      </div>
    </div>
  );
}
