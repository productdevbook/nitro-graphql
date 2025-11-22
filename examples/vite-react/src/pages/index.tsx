import { Link } from 'react-router-dom'
import reactLogoSvg from '../assets/react.svg'
import HelloWorld from '../components/HelloWorld'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center space-y-12 p-8">
        {/* Logos */}
        <div className="flex items-center justify-center gap-8 flex-wrap">
          <a
            href="https://vite.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-transform hover:-translate-y-2 duration-300"
          >
            <img
              src="/vite.svg"
              width="128"
              height="128"
              className="h-32 hover:drop-shadow-[0_0_3rem_#646cffaa]"
              alt="Vite logo"
            />
          </a>
          <a
            href="https://react.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-transform hover:-translate-y-2 duration-300"
          >
            <img
              src={reactLogoSvg}
              width="128"
              height="128"
              className="h-32 hover:drop-shadow-[0_0_3rem_#61dafbaa]"
              alt="React logo"
            />
          </a>
          <a
            href="https://nitro.unjs.io"
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-transform hover:-translate-y-2 duration-300"
          >
            <img
              src="https://v3.nitro.build/icon.svg"
              width="128"
              height="128"
              className="h-32 hover:drop-shadow-[0_0_3rem_#00dc82aa]"
              alt="Nitro logo"
            />
          </a>
          <a
            href="https://github.com/productdevbook/nitro-graphql"
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-transform hover:-translate-y-2 duration-300"
          >
            <img
              src="https://github.com/productdevbook/nitro-graphql/raw/main/.docs/public/logo.svg"
              width="128"
              height="128"
              className="h-32 hover:drop-shadow-[0_0_3rem_#e535abaa]"
              alt="Nitro GraphQL logo"
            />
          </a>
        </div>

        {/* Content */}
        <HelloWorld msg="Vite + React + Nitro + Nitro GraphQL" />

        {/* Navigation */}
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            to="/about"
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            About
          </Link>
          <Link
            to="/contact"
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Contact
          </Link>
          <Link
            to="/pinia-colada-demo"
            className="px-6 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            React Query Demo
          </Link>
        </div>
      </div>
    </div>
  )
}
