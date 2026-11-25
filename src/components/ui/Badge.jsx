import './Badge.css'

export default function Badge({ children, tone = 'neutral' }) {
  return <span className={`nf-badge nf-badge--${tone}`}>{children}</span>
}
