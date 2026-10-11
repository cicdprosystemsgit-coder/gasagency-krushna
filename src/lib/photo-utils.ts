/**
 * src/lib/photo-utils.ts
 * Utilities for formatting delivery proof photo URLs for browser viewing and downloads.
 */

/**
 * Returns a displayable URL for any delivery proof photo.
 * If the photo is stored in a private AWS S3 bucket, it automatically routes through
 * our secure authenticated proxy endpoint (/api/delivery-photos/view), preventing
 * AWS AccessDenied XML errors and broken preview thumbnails.
 */
export function getPhotoDisplayUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("/api/delivery-photos/view")) return rawUrl;

  if (rawUrl.includes("amazonaws.com") || rawUrl.startsWith("agencies/")) {
    return `/api/delivery-photos/view?url=${encodeURIComponent(rawUrl)}`;
  }

  return rawUrl;
}

/**
 * Returns a direct pre-signed download / full resolution URL for opening in a new tab.
 */
export function getPhotoFullResUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "";
  if (rawUrl.includes("amazonaws.com") || rawUrl.startsWith("agencies/")) {
    return `/api/delivery-photos/view?url=${encodeURIComponent(rawUrl)}&presigned=1`;
  }
  return rawUrl;
}
