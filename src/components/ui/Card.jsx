import './Card.css'

export default function Card({ title, action, children, className = '' }) {
  return (
    <section className={`nf-card ${className}`.trim()}>
      {(title || action) && (
        <div className="nf-card__header">
          {title ? <h2 className="nf-card__title">{title}</h2> : <span />}
          {action ? <div className="nf-card__action">{action}</div> : null}
        </div>
      )}
      <div className="nf-card__body">{children}</div>
    </section>
  )
}
