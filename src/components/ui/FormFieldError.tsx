"use client";

interface FormFieldErrorProps {
  message?: string;
}

export function FormFieldError({ message }: FormFieldErrorProps) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-500">{message}</p>;
}
