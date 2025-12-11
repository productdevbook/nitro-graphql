import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'
import ErrorOverlay from './components/ErrorOverlay'
import { ErrorOverlayProvider, useErrorOverlay } from './contexts/ErrorOverlayContext'
import { router } from './router'

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function AppContent() {
  const { isVisible } = useErrorOverlay()

  return (
    <>
      {!isVisible && (
        <Suspense fallback={(
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-white text-lg">Loading...</div>
          </div>
        )}
        >
          <RouterProvider router={router} />
        </Suspense>
      )}
      <ErrorOverlay />
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorOverlayProvider>
        <AppContent />
      </ErrorOverlayProvider>
    </QueryClientProvider>
  )
}

export default App
