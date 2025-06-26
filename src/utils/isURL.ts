// src/utils/isURL.ts
export function isURL(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}
