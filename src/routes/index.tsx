import { createFileRoute } from '@tanstack/react-router'
import logo from '../logo.svg'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <h1 className="text-red-600 text-lg font-bold uppercase">hello world</h1>
  )
}
