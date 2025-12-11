import { createPortal } from 'react-dom'
import { useErrorOverlay } from '../contexts/ErrorOverlayContext'

export default function ErrorOverlay() {
  const { isVisible, errorMessage, reload } = useErrorOverlay()

  if (!isVisible)
    return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-title"
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Title */}
        <h2 id="error-title" className="text-2xl font-bold text-white">
          Something went wrong
        </h2>

        {/* Message */}
        <p className="text-gray-400">
          {errorMessage}
        </p>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <button
            onClick={reload}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Reload Page
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
