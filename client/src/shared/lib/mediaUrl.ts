function trimTrailingSlash(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function getMediaBaseUrl() {
  const configuredMediaBaseUrl = String(import.meta.env.VITE_MEDIA_BASE_URL || '').trim()
  if (configuredMediaBaseUrl && configuredMediaBaseUrl !== '/') {
    return trimTrailingSlash(configuredMediaBaseUrl)
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return trimTrailingSlash(window.location.origin)
  }

  const apiBaseUrl = String(import.meta.env.VITE_API || '').trim().replace(/\/api\/?$/i, '')
  return trimTrailingSlash(apiBaseUrl)
}

/** Полный URL для медиа с сервера (/media/...) */
export function resolveMediaUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null
  if (
    relativePath.startsWith('http://') ||
    relativePath.startsWith('https://') ||
    relativePath.startsWith('blob:') ||
    relativePath.startsWith('data:')
  ) {
    return relativePath
  }

  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return `${getMediaBaseUrl()}${normalizedPath}`
}
