import { Desk } from './components/Desk'
import { DeskProvider } from './store'

export function App() {
  return (
    <DeskProvider>
      <Desk />
    </DeskProvider>
  )
}
