"use client"
// Semplice wrapper su input type=date per ora; sostituibile con shadcn Calendar
import { HTMLProps } from 'react'

export function DatePicker(props: HTMLProps<HTMLInputElement>) {
  return <input type="date" {...props} />
}
