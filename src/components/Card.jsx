export function Card({ children, title, subtitle, tone = 'default' }) {
  return (
    <section className={`card card-${tone}`}>
      {(title || subtitle) && (
        <header className="card-header">
          {title ? <h2>{title}</h2> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </header>
      )}
      {children}
    </section>
  )
}
