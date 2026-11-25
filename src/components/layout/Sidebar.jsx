import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { navItems } from '../../config/navigation'
import './Sidebar.css'

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <div
        className={`nf-sidebar-overlay ${open ? 'is-visible' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`nf-sidebar ${open ? 'is-open' : ''}`}
        aria-label="Main navigation"
      >
        <div className="nf-sidebar__brand">
          <div className="nf-sidebar__brand-mark" aria-hidden="true">
            N
          </div>
          <div className="nf-sidebar__brand-text">
            <span className="nf-sidebar__product">NexusFlow</span>
            <span className="nf-sidebar__org">Lumivex Nexus</span>
          </div>
          <button
            type="button"
            className="nf-sidebar__close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="nf-sidebar__nav">
          <p className="nf-sidebar__section-label">Operations</p>
          <ul className="nf-sidebar__list">
            {navItems.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `nf-sidebar__link ${isActive ? 'is-active' : ''}`
                  }
                  onClick={onClose}
                >
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nf-sidebar__footer">
          <p className="nf-sidebar__footer-text">Business operations for retailers</p>
        </div>
      </aside>
    </>
  )
}
