import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // eslint-disable-next-line no-console
    console.log('Form submitted:', { name, email, message })
    // eslint-disable-next-line no-alert
    alert('Form submitted! (Check console)')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-12">
      <div className="max-w-md w-full mx-auto p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-2">Contact</h1>
          <p className="text-gray-400">Get in touch with us</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              type="text"
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Your message..."
            >
            </textarea>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Send Message
          </button>
        </form>

        <Link
          to="/"
          className="block text-center text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
