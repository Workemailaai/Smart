/** Полный URL для статики с сервера (/media/...) */
export function resolveMediaUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath
  }
  const api = import.meta.env.VITE_API || ''
  const base = api.replace(/\/api\/?$/i, '')
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return `${base}${path}`
}
