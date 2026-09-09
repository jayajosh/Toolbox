import { useEffect, useState } from 'react'
import { Brand } from './components/Brand'
import { InventoryPage } from './pages/InventoryPage'
import { ItemPage } from './pages/ItemPage'
import { LocationsPage } from './pages/LocationsPage'
import { SpaceDesignerPage } from './pages/SpaceDesignerPage'

type Route = { page: 'inventory' | 'item' | 'locations' | 'designer'; id?: string }
type Theme = 'day' | 'night'
const THEME_KEY = 'toolbox-theme'

function initialTheme(): Theme {
  return window.localStorage.getItem(THEME_KEY) === 'night' ? 'night' : 'day'
}

function routeFromLocation(): Route {
  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts[0] === 'locations') return { page: 'locations' }
  if (parts[0] === 'designer') return { page: 'designer' }
  if (parts[0] === 'items' && parts[1]) return { page: 'item', id: parts[1] === 'new' ? undefined : parts[1] }
  return { page: 'inventory' }
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromLocation)
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromLocation())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(path: string) {
    window.history.pushState({}, '', path)
    setRoute(routeFromLocation())
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand onNavigate={navigate} />
        <nav className="main-nav" aria-label="Main navigation">
          <button className={route.page === 'inventory' ? 'nav-link is-active' : 'nav-link'} type="button" onClick={() => navigate('/')}>Inventory</button>
          <button className={route.page === 'locations' ? 'nav-link is-active' : 'nav-link nav-link--muted'} type="button" onClick={() => navigate('/locations')}><span className="nav-dot" /> Locations</button>
          <button className={route.page === 'designer' ? 'nav-link is-active' : 'nav-link nav-link--muted'} type="button" onClick={() => navigate('/designer')}>Space designer</button>
        </nav>
         <button className="theme-switch" type="button" onClick={() => setTheme((current) => current === 'day' ? 'night' : 'day')} aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} mode`}><span className="theme-switch-track"><span className="theme-switch-thumb" /></span><span>{theme === 'day' ? 'Day' : 'Night'}</span></button>
      </header>
      {route.page === 'inventory' && <InventoryPage onNavigate={navigate} />}
      {route.page === 'item' && <ItemPage id={route.id} onNavigate={navigate} />}
      {route.page === 'locations' && <LocationsPage onNavigate={navigate} />}
      {route.page === 'designer' && <SpaceDesignerPage onNavigate={navigate} />}
      <footer className="app-footer"><span>Toolbox / A clearer place for everything.</span><span>Foundation build</span></footer>
    </div>
  )
}
