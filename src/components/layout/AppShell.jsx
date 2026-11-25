import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { pageTitles } from '../../config/navigation'
import Header from './Header'
import MobileNav from './MobileNav'
import Sidebar from './Sidebar'
import './AppShell.css'

export default function AppShell() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [navPath, setNavPath] = useState(location.pathname)
  const pageTitle = pageTitles[location.pathname] ?? 'NexusFlow'

  if (location.pathname !== navPath) {
    setNavPath(location.pathname)
    if (sidebarOpen) setSidebarOpen(false)
  }

  useEffect(() => {
    if (!sidebarOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="nf-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="nf-shell__main">
        <Header
          pageTitle={pageTitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="nf-shell__content">
          <div className="nf-shell__content-inner">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav onMoreClick={() => setSidebarOpen(true)} />
    </div>
  )
}
