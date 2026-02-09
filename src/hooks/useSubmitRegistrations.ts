import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

type SubmitResult = {
  success: boolean;
  submittedCount: number;
};

export function useSubmitRegistrations(courseEditionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SubmitResult> => {
      const res = await fetch(
        `/api/corsi/${courseEditionId}/invia-anagrafiche`,
        {
        method: "POST",
        }
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Errore durante l'invio");
      }
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["courses"] });
      await queryClient.cancelQueries({
        queryKey: ["registrations", courseEditionId],
      });

      const previousCourse = queryClient.getQueryData([
        "courses",
        courseEditionId,
      ]);
      queryClient.setQueryData(["courses", courseEditionId], (old: any) => ({
        ...(old || {}),
        registrationStatus: "SENT",
      }));

      return { previousCourse };
    },
    onError: (err, _variables, context) => {
      if (context?.previousCourse) {
        queryClient.setQueryData(
          ["courses", courseEditionId],
          context.previousCourse
        );
      }
      toast.error(err instanceof Error ? err.message : "Errore durante l'invio");
    },
    onSuccess: (data) => {
      toast.success(`${data.submittedCount} anagrafiche inviate con successo`);
      trackEvent.registrationSubmitted(courseEditionId, data.submittedCount);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({
        queryKey: ["registrations", courseEditionId],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
