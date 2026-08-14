import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Junta classes resolvendo conflitos do Tailwind (a última vence). */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
