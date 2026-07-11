/**
 * Escape special regex characters in user input.
 *
 * @param value Input string.
 * @returns Escaped string safe for RegExp.
 */
export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}