import { useEffect, useState } from 'react'
import { Brand } from './components/Brand'
import { CheckoutPage } from './pages/CheckoutPage'
import { InventoryPage } from './pages/InventoryPage'
import { ItemPage } from './pages/ItemPage'
import { LocationsPage } from './pages/LocationsPage'
import { SpaceDesignerPage } from './pages/SpaceDesignerPage'

type Route = { page: 'inventory' | 'item' | 'locations' | 'designer' | 'checkout'; id?: string }
type Theme = 'light' | 'dark'
type InventoryAction = 'import' | 'export'
const THEME_KEY = 'toolbox-theme'

function initialTheme(): Theme {
  return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

function routeFromLocation(): Route {
  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts[0] === 'checkout') return { page: 'checkout' }
  if (parts[0] === 'locations') return { page: 'locations' }
  if (parts[0] === 'designer') return { page: 'designer' }
  if (parts[0] === 'items' && parts[1]) return { page: 'item', id: parts[1] === 'new' ? undefined : parts[1] }
  return { page: 'inventory' }
}

function ThemeSwitch({ theme, className, onToggle }: { theme: Theme; className: string; onToggle: () => void }) {
  return <button className={`theme-switch ${className}`} type="button" onClick={onToggle} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
    <span className="theme-switch-label">{theme === 'light' ? 'Light' : 'Dark'}</span>
    <svg className="theme-switch-icon" viewBox="0 0 24 24" aria-hidden="true">
      {theme === 'light'
        ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></>
        : <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />}
    </svg>
    <span className="theme-switch-track"><span className="theme-switch-thumb" /></span>
  </button>
}

function HeaderTools({ theme, onInventoryAction, onToggleTheme }: { theme: Theme; onInventoryAction: (action: InventoryAction) => void; onToggleTheme: () => void }) {
  return <div className="header-tools">
    <button className="header-tool-action" type="button" onClick={() => onInventoryAction('import')}>Import{' '}<span className="header-tool-suffix">tools</span></button>
    <button className="header-tool-action" type="button" onClick={() => onInventoryAction('export')}>Export{' '}<span className="header-tool-suffix">tools</span></button>
    <ThemeSwitch theme={theme} className="theme-switch--desktop" onToggle={onToggleTheme} />
  </div>
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

  function toggleTheme() {
    setTheme((current) => current === 'light' ? 'dark' : 'light')
  }

  function requestInventoryAction(action: InventoryAction) {
    const dispatch = () => window.dispatchEvent(new Event(`toolbox:${action}-tools`))
    if (route.page === 'inventory') dispatch()
    else {
      navigate('/')
      window.setTimeout(dispatch, 0)
    }
  }

  return (
    <div className={route.page === 'designer' ? 'app-shell is-floor-plan' : 'app-shell'}>
      <header className="app-header">
        <Brand onNavigate={navigate} />
        <nav className="main-nav" aria-label="Main navigation">
           <button className={route.page === 'inventory' ? 'nav-link is-active' : 'nav-link'} type="button" onClick={() => navigate('/')}>Inventory</button>
           <button className={route.page === 'locations' ? 'nav-link is-active' : 'nav-link nav-link--muted'} type="button" onClick={() => navigate('/locations')}>Storage</button>
           <button className={route.page === 'designer' ? 'nav-link is-active' : 'nav-link nav-link--muted'} type="button" onClick={() => navigate('/designer')}>Floor plan</button>
           <button className={route.page === 'checkout' ? 'nav-link is-active' : 'nav-link nav-link--muted'} type="button" onClick={() => navigate('/checkout')}>Check out</button>
         </nav>
          <HeaderTools theme={theme} onInventoryAction={requestInventoryAction} onToggleTheme={toggleTheme} />
       </header>
       {route.page === 'inventory' && <InventoryPage onNavigate={navigate} />}
      {route.page === 'checkout' && <CheckoutPage onNavigate={navigate} />}
      {route.page === 'item' && <ItemPage id={route.id} onNavigate={navigate} />}
      {route.page === 'locations' && <LocationsPage onNavigate={navigate} />}
       {route.page === 'designer' && <SpaceDesignerPage />}
       <footer className="app-footer"><span>Toolbox / A clearer place for everything.</span><span>V1</span></footer>
    </div>
  )
}
