import { Bell, LogOut, Menu, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './Header.css'

function initialsFrom(text) {
  if (!text) return 'NF'
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function Header({ pageTitle, onMenuClick }) {
  const { business, user, signOut } = useAuth()
  const businessName = business?.business_name || 'No business linked'
  const profileLabel = user?.email || 'Signed in'
  const avatar = initialsFrom(business?.business_name || user?.email)

  return (
    <header className="nf-header">
      <div className="nf-header__left">
        <button
          type="button"
          className="nf-header__menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>
        <div className="nf-header__titles">
          <p className="nf-header__business">{businessName}</p>
          <h1 className="nf-header__page">{pageTitle}</h1>
        </div>
      </div>

      <div className="nf-header__right">
        <div className="nf-header__search" role="search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search products, customers…"
            aria-label="Search"
            disabled
            title="Global search will be available in a later phase"
          />
        </div>

        <button
          type="button"
          className="nf-header__icon-btn"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={18} />
        </button>

        <div className="nf-header__profile" title={profileLabel}>
          <div className="nf-header__avatar" aria-hidden="true">
            {avatar}
          </div>
          <div className="nf-header__profile-text">
            <span className="nf-header__profile-name">
              {user?.email?.split('@')[0] || 'Owner'}
            </span>
            <span className="nf-header__profile-role">Owner</span>
          </div>
        </div>

        <button
          type="button"
          className="nf-header__icon-btn"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => {
            signOut().catch((error) => {
              console.error('[NexusFlow] Sign out failed', error)
            })
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
