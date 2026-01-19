import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CF_REGEX = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/

export function isValidCodiceFiscale(cf: string): boolean {
  // TODO: implement checksum validation; for now only regex
  return CF_REGEX.test(cf.toUpperCase())
}
