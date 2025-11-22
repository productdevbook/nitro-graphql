import { useState } from 'react'
import { useUser } from '../hooks/useUser'

interface HelloWorldProps {
  msg: string
}

export default function HelloWorld({ msg }: HelloWorldProps) {
  const [count, setCount] = useState(0)

  // React Query ile user data fetch
  const { user, isLoading: loading, error, refetch } = useUser()

  return (
    <div className="space-y-8">
      <h1 className="text-5xl font-bold text-white">{msg}</h1>

      {/* GraphQL User Data */}
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 min-h-[240px] flex flex-col">
        <h2 className="text-xl font-semibold text-white mb-4">GraphQL SDK Demo</h2>

        {loading && (
          <div className="text-gray-400">
            Loading user data...
          </div>
        )}

        {error && (
          <div className="text-red-400">
            Error:
            {' '}
            {error.message}
          </div>
        )}

        {user && (
          <div className="space-y-2 text-gray-300">
            <p>
              <span className="text-gray-400">ID:</span>
              {' '}
              {user.id}
            </p>
            <p>
              <span className="text-gray-400">Name:</span>
              {' '}
              {user.name}
            </p>
            <p>
              <span className="text-gray-400">Email:</span>
              {' '}
              {user.email}
            </p>
          </div>
        )}

        <button
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded transition-colors duration-200"
        >
          Refresh
        </button>
      </div>

      {/* Counter */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setCount(count + 1)}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-blue-500/50"
        >
          count is
          {' '}
          {count}
        </button>
      </div>
    </div>
  )
}
