import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ModeProvider } from './lib/mode'
import { NotFound } from './pages/NotFound'
import { SearchPage } from './pages/SearchPage'
import { TrackerPage } from './pages/TrackerPage'

export default function App() {
  return (
    <ModeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<SearchPage />} />
            <Route path="tracker" element={<TrackerPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ModeProvider>
  )
}
