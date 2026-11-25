import { NavLink } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { mobilePrimaryNav } from '../../config/navigation'
import './MobileNav.css'

export default function MobileNav({ onMoreClick }) {
  return (
    <nav className="nf-mobile-nav" aria-label="Mobile primary navigation">
      {mobilePrimaryNav.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            `nf-mobile-nav__item ${isActive ? 'is-active' : ''}`
          }
        >
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
      <button
        type="button"
        className="nf-mobile-nav__item"
        onClick={onMoreClick}
        aria-label="More navigation"
      >
        <MoreHorizontal size={20} strokeWidth={2} aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  )
}
