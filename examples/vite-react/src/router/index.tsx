import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'

// Lazy load pages for code splitting
const Home = lazy(() => import('../pages/index'))
const About = lazy(() => import('../pages/about'))
const Contact = lazy(() => import('../pages/contact'))
const PiniaColadaDemo = lazy(() => import('../pages/pinia-colada-demo'))
const NotFound = lazy(() => import('../pages/404'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/about',
    element: <About />,
  },
  {
    path: '/contact',
    element: <Contact />,
  },
  {
    path: '/pinia-colada-demo',
    element: <PiniaColadaDemo />,
  },
  // Catch-all 404 route - must be last
  {
    path: '*',
    element: <NotFound />,
  },
])
