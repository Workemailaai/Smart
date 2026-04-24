import './styles/index.css'
import './styles/variables.css'
import { RouterProvider } from 'react-router'
import { routerConfig } from './config/routesConfig'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { userStore } from '@/entities/user'

export const App = observer(() => {
  useEffect(() => {
    void userStore.refreshTokens()
  }, [])

  if (!userStore.isAuthCheckCompleted) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Проверка сессии...</div>
  }

  return (
    <>
      <RouterProvider router={routerConfig} />
    </>
  )
})
