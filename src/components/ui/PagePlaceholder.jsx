import './PagePlaceholder.css'

export default function PagePlaceholder({ title, description }) {
  return (
    <div className="nf-placeholder">
      <div className="nf-placeholder__panel">
        <h2 className="nf-placeholder__title">{title}</h2>
        <p className="nf-placeholder__text">
          {description ??
            'This module is a placeholder. Full functionality will be built in a later phase.'}
        </p>
      </div>
    </div>
  )
}
