import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* 404 Header */}
        <div className="text-center space-y-4">
          <div className="text-8xl font-bold text-blue-500">404</div>

          <h1 className="text-4xl font-bold text-white">
            Page Not Found
          </h1>

          <p className="text-xl text-gray-400">
            The page you're looking for doesn't exist.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  )
}
