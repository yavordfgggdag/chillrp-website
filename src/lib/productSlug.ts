/** URL-safe slug за продукти (латиница, числа, тирета). */
export function slugifyProductSlug(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || "product";
}
