export function slugifyName(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)

  return slug || "app"
}

export function withSuffix(base: string, suffix: string, maxLength = 64): string {
  const cleanSuffix = suffix.replace(/[^a-z0-9-]/gi, "").toLowerCase()
  const truncatedBase = base.slice(0, Math.max(1, maxLength - cleanSuffix.length - 1))
  return `${truncatedBase}-${cleanSuffix}`
}

export function randomSuffix(length = 4): string {
  return Math.random().toString(36).slice(2, 2 + length)
}
