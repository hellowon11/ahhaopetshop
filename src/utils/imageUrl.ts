/** Normalize pet image URLs for Vite public assets or Supabase Storage. */
export function getImageUrl(url?: string | null): string {
  if (!url) return "/default-pet-image.png";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  // Local public paths like /imgs/...
  if (url.startsWith("/")) return url;
  return `/${url}`;
}
