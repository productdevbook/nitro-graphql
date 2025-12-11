import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../hooks/useUser'

// Test scenarios
const testCases = [
  { id: '1', label: 'Valid User (ID: 1)', description: 'Returns User type' },
  { id: '2', label: 'Valid User (ID: 2)', description: 'Returns User type' },
  { id: '999', label: 'Non-existent User', description: 'Returns UserNotFoundError' },
  { id: 'forbidden', label: 'Forbidden User', description: 'Returns UnauthorizedError' },
]

export default function PiniaColadaDemo() {
  // Reactive user ID for testing different scenarios
  const [userId, setUserId] = useState('1')

  // Use the hook with union type error handling
  const {
    userResult,
    user,
    isLoading,
    error,
    isSuccess,
    isNotFound,
    isUnauthorized,
    errorMessage,
    refetch,
  } = useUser(userId)

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Link
            to="/"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Union Type Error Handling Demo
          </h1>
          <p className="text-gray-400">
            GraphQL "Errors as Data" pattern - Fixing the null ambiguity problem
          </p>
        </div>

        {/* Test Controls */}
        <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            Test Different Scenarios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testCases.map(testCase => (
              <button
                key={testCase.id}
                onClick={() => setUserId(testCase.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  userId === testCase.id
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 bg-gray-900/30 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold text-white">{testCase.label}</div>
                <div className="text-sm text-gray-400 mt-1">{testCase.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Result Display */}
        <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Query Result
            </h2>
            <button
              onClick={refetch}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-medium rounded transition-colors duration-200"
            >
              {isLoading ? 'Loading...' : 'Refetch'}
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-gray-400 py-8">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span>Loading user data...</span>
              </div>
            </div>
          )}

          {/* System Error (Network, Server Crash, etc.) */}
          {error && (
            <div className="text-red-400 p-4 bg-red-900/20 rounded-lg">
              <div className="font-semibold mb-2">System Error</div>
              <div>{error.message}</div>
              <div className="text-sm text-gray-400 mt-2">
                (This is an unexpected error, not a business logic error)
              </div>
            </div>
          )}

          {/* Union Type Results */}
          {userResult && !error && (
            <div className="space-y-4">
              {/* Type Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Result Type:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-mono font-semibold ${
                    isSuccess ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                  }`}
                >
                  {userResult.__typename}
                </span>
              </div>

              {/* SUCCESS: User Type */}
              {isSuccess && (
                <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">✅</span>
                    <h3 className="text-lg font-semibold text-green-300">Success</h3>
                  </div>
                  <div className="space-y-2 text-gray-300">
                    <p>
                      <span className="text-gray-400">ID:</span>
                      {' '}
                      <span className="font-mono">{user?.id}</span>
                    </p>
                    <p>
                      <span className="text-gray-400">Name:</span>
                      {' '}
                      {user?.name}
                    </p>
                    <p>
                      <span className="text-gray-400">Email:</span>
                      {' '}
                      {user?.email}
                    </p>
                    <p>
                      <span className="text-gray-400">Created:</span>
                      {' '}
                      {user?.createdAt}
                    </p>
                  </div>
                </div>
              )}

              {/* ERROR: User Not Found */}
              {isNotFound && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🔍</span>
                    <h3 className="text-lg font-semibold text-yellow-300">User Not Found</h3>
                  </div>
                  <div className="space-y-2 text-gray-300">
                    <p>
                      <span className="text-gray-400">Message:</span>
                      {' '}
                      {errorMessage}
                    </p>
                    {userResult.__typename === 'UserNotFoundError' && 'userId' in userResult && (
                      <p>
                        <span className="text-gray-400">User ID:</span>
                        <span className="font-mono">
                          {' '}
                          {userResult.userId}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="mt-4 text-sm text-gray-400">
                    💡 This is a valid business scenario - the user doesn't exist
                  </div>
                </div>
              )}

              {/* ERROR: Unauthorized */}
              {isUnauthorized && (
                <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🚫</span>
                    <h3 className="text-lg font-semibold text-red-300">Unauthorized Access</h3>
                  </div>
                  <div className="space-y-2 text-gray-300">
                    <p>
                      <span className="text-gray-400">Message:</span>
                      {' '}
                      {errorMessage}
                    </p>
                    {userResult.__typename === 'UnauthorizedError' && 'requiredPermission' in userResult && (
                      <p>
                        <span className="text-gray-400">Required Permission:</span>
                        <span className="font-mono">
                          {' '}
                          {userResult.requiredPermission}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="mt-4">
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded">
                      Request Access
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pattern Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Traditional Approach */}
          <div className="p-6 bg-red-900/10 border border-red-700/50 rounded-lg">
            <h3 className="text-lg font-semibold text-red-300 mb-3">
              ❌ Traditional Approach Problems
            </h3>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>
                •
                <strong>Null Ambiguity:</strong>
                {' '}
                user === null - Why?
              </li>
              <li>
                •
                <strong>No Type Safety:</strong>
                {' '}
                Untyped error messages
              </li>
              <li>
                •
                <strong>Null Propagation:</strong>
                {' '}
                Errors destroy parent data
              </li>
              <li>
                •
                <strong>Out-of-Band Errors:</strong>
                {' '}
                errors array is separate
              </li>
              <li>
                •
                <strong>Complex Handling:</strong>
                {' '}
                Check both data and errors
              </li>
            </ul>
          </div>

          {/* Union Type Approach */}
          <div className="p-6 bg-green-900/10 border border-green-700/50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-300 mb-3">
              ✅ Union Type Advantages
            </h3>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>
                •
                <strong>Explicit Types:</strong>
                {' '}
                __typename tells you exactly what happened
              </li>
              <li>
                •
                <strong>Type Safety:</strong>
                {' '}
                Structured, schema-validated errors
              </li>
              <li>
                •
                <strong>No Null Ambiguity:</strong>
                {' '}
                Clear success vs error states
              </li>
              <li>
                •
                <strong>Better UX:</strong>
                {' '}
                Error-specific UI and actions
              </li>
              <li>
                •
                <strong>Self-Documenting:</strong>
                {' '}
                Schema shows all possible outcomes
              </li>
            </ul>
          </div>
        </div>

        {/* Code Example */}
        <div className="p-6 bg-gray-900/50 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">
            📝 Pattern Summary
          </h3>
          <div className="bg-black/50 p-4 rounded font-mono text-sm overflow-x-auto">
            <pre className="text-gray-300">
              <span className="text-purple-400">union</span>
              {' '}
              <span className="text-yellow-300">UserResult</span>
              {' '}
              =
              {' '}
              <span className="text-green-300">User</span>
              {' '}
              |
              {' '}
              <span className="text-red-300">UserNotFoundError</span>
              {' '}
              |
              {' '}
              <span className="text-red-300">UnauthorizedError</span>

              <span className="text-purple-400">type</span>
              {' '}
              <span className="text-yellow-300">Query</span>
              {' '}
              {'{'}
              getUser(id: ID!):
              {' '}
              <span className="text-yellow-300">UserResult!</span>
              {' '}
              <span className="text-gray-500">// Always returns something</span>
              {'}'}

              <span className="text-gray-500">// Client handling with __typename</span>
              <span className="text-purple-400">if</span>
              {' '}
              (result.__typename ===
              <span className="text-green-400">'User'</span>
              )
              {'{'}
              <span className="text-gray-500">// TypeScript knows: result.name, result.email available</span>
              {'}'}
              {' '}
              <span className="text-purple-400">else if</span>
              {' '}
              (result.__typename ===
              {' '}
              <span className="text-green-400">'UserNotFoundError'</span>
              )
              {' '}
              {'{'}
              <span className="text-gray-500">// TypeScript knows: result.userId available</span>
              {'}'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
