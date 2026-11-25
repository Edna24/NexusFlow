import './StatCard.css'

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  hint,
}) {
  return (
    <article className={`nf-stat nf-stat--${tone}`}>
      <div className="nf-stat__icon" aria-hidden="true">
        {Icon ? <Icon size={20} strokeWidth={2} /> : null}
      </div>
      <div className="nf-stat__content">
        <p className="nf-stat__label">{label}</p>
        <p className="nf-stat__value">{value}</p>
        {hint ? <p className="nf-stat__hint">{hint}</p> : null}
      </div>
    </article>
  )
}
