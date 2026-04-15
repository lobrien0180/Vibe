export function ScreenHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="screen-header">
      <div>
        {eyebrow ? <p className="screen-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="screen-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="screen-actions">{actions}</div> : null}
    </header>
  )
}
