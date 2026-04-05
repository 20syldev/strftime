import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names and resolve Tailwind utility conflicts.
 * Combines clsx's conditional handling with tailwind-merge deduplication.
 *
 * @param inputs - Class values: strings, arrays, or conditional objects
 * @returns A single className string with conflicting utilities resolved
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
