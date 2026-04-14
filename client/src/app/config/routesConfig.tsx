import { Navigate, createBrowserRouter } from 'react-router'
import { Layout } from './Layout'
import { CabinetPage, ContestResultsPage, CreateEventPage, JuryContestPage, MainPage, OrganizerContestPage } from '@/pages'

export const routerConfig = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <MainPage />,
      },
      {
        path: 'cabinet',
        children: [
          {
            index: true,
            element: <Navigate replace to="/cabinet/events" />,
          },
          {
            path: 'events',
            element: <CabinetPage section="events" />,
          },
          {
            path: 'events/:contestId/jury',
            element: <JuryContestPage />,
          },
          {
            path: 'events/:contestId/organizer',
            element: <OrganizerContestPage />,
          },
          {
            path: 'events/:contestId/results',
            element: <ContestResultsPage />,
          },
          {
            path: 'constructor',
            element: <CabinetPage section="constructor" />,
          },
          {
            path: 'constructor/new',
            element: <CreateEventPage />,
          },
          {
            path: 'settings',
            element: <CabinetPage section="settings" />,
          },
          {
            path: 'info',
            element: <CabinetPage section="info" />,
          },
        ],
      },
    ],
  },
])