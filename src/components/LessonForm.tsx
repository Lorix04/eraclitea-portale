"use client";

import { useEffect, useState } from "react";
import { ItalianDateInput } from "@/components/ui/italian-date-input";
import { formatItalianDate } from "@/lib/date-utils";
import { Lesson, LessonFormData } from "@/types";

interface LessonFormProps {
  lesson?: Lesson;
  onSubmit: (data: LessonFormData) => void;
  onCancel: () => void;
}

export function LessonForm({ lesson, onSubmit, onCancel }: LessonFormProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationHours, setDurationHours] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (lesson) {
      setDate(formatItalianDate(lesson.date));
      setStartTime(lesson.startTime ?? "");
      setEndTime(lesson.endTime ?? "");
      setDurationHours(lesson.durationHours ?? "");
      setTitle(lesson.title ?? "");
      setNotes(lesson.notes ?? "");
      return;
    }
    setDate("");
    setStartTime("");
    setEndTime("");
    setDurationHours("");
    setTitle("");
    setNotes("");
  }, [lesson]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!date || !durationHours) {
      return;
    }

    onSubmit({
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      durationHours: Number(durationHours),
      title: title || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ItalianDateInput
        label="Data *"
        value={date}
        onChange={setDate}
        required
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Orario inizio
          <input
            type="time"
            className="rounded-md border bg-background px-3 py-2"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Orario fine
          <input
            type="time"
            className="rounded-md border bg-background px-3 py-2"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        Durata (ore) *
        <input
          type="number"
          min="0.5"
          step="0.5"
          className="rounded-md border bg-background px-3 py-2"
          value={durationHours}
          onChange={(event) =>
            setDurationHours(event.target.value ? Number(event.target.value) : "")
          }
          required
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Argomento/Titolo
        <input
          type="text"
          className="rounded-md border bg-background px-3 py-2"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Note
        <textarea
          className="rounded-md border bg-background px-3 py-2"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm"
          onClick={onCancel}
        >
          Annulla
        </button>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Salva
        </button>
      </div>
    </form>
  );
}
