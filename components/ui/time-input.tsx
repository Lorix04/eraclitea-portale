"use client"
import { HTMLProps } from 'react'

export function TimeInput(props: HTMLProps<HTMLInputElement>) {
  return <input type="time" pattern="[0-9]{2}:[0-9]{2}" {...props} />
}
