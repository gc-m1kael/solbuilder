const FALLBACK_APP_URL = "/demo-app/index.html"

export function getPreviewUrl() {
  const configuredUrl = import.meta.env.VITE_GENERATED_APP_URL?.trim()

  if (configuredUrl) {
    return configuredUrl
  }

  return FALLBACK_APP_URL
}
