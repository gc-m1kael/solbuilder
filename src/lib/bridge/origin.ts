import { getPreviewUrl } from "@/lib/preview-url"

export function getPreviewOrigin(previewUrl = getPreviewUrl()): string {
  if (previewUrl.startsWith("/")) {
    return window.location.origin
  }

  return new URL(previewUrl, window.location.origin).origin
}
