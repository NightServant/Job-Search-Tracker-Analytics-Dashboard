import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names, letting later Tailwind utilities win over earlier ones.
 *
 * Plain `clsx` would leave `px-4 px-6` both in the string and let CSS source
 * order decide, which makes a variant's override depend on where Tailwind
 * happened to emit the rule. `twMerge` resolves the conflict by keyword.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
