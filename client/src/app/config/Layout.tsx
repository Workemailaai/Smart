import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'

export function Layout() {
  const location = useLocation()

  useEffect(() => {
    const isMainPage = location.pathname === '/'
    const isAuthPage = location.pathname.startsWith('/auth/')
    const isContestResultsPage = /^\/cabinet\/events\/[^/]+\/results$/.test(location.pathname)

    const pageThemeColor = isMainPage || isAuthPage || isContestResultsPage ? '#0a0f15' : '#f0f1f5'
    const themeColorMetaElement = document.querySelector('meta[name="theme-color"]')

    if (themeColorMetaElement) {
      themeColorMetaElement.setAttribute('content', pageThemeColor)
    } else {
      const createdThemeColorMetaElement = document.createElement('meta')
      createdThemeColorMetaElement.setAttribute('name', 'theme-color')
      createdThemeColorMetaElement.setAttribute('content', pageThemeColor)
      document.head.appendChild(createdThemeColorMetaElement)
    }

    document.body.style.backgroundColor = pageThemeColor
  }, [location.pathname])

  return (
    <div className="app">
      <main className="name">
        <Outlet />
      </main>
    </div>
  )
}