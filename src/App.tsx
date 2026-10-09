import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ModeProvider } from './lib/mode'
import { DemoLanding } from './pages/DemoLanding'
import { LeadPage } from './pages/LeadPage'
import { LoginPage } from './pages/LoginPage'
import { NotFound } from './pages/NotFound'
import { SearchPage } from './pages/SearchPage'
import { TrackerPage } from './pages/TrackerPage'
import { UsagePage } from './pages/UsagePage'

export default function App() {
  return (
    <ModeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="p/:slug" element={<DemoLanding />} />
          <Route element={<Layout />}>
            <Route index element={<SearchPage />} />
            <Route path="lead/:key" element={<LeadPage />} />
            <Route path="tracker" element={<TrackerPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="usage" element={<UsagePage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ModeProvider>
  )
}
