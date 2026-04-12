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
  return (
    <>
      <RouterProvider router={routerConfig} />
    </>
  )
})
