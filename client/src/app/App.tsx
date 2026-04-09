import './styles/index.css'
import './styles/variables.css'
import { RouterProvider } from 'react-router'
import { routerConfig } from './config/routesConfig'


export function App() {
  return (
    <>
      <RouterProvider router={routerConfig} />
    </>
  )
}
