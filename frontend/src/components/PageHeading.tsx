import type { ReactNode } from 'react'

type PageHeadingProps = {
  kicker: string
  belowKicker?: ReactNode
  actions?: ReactNode
}

export function PageHeading({ kicker, belowKicker, actions }: PageHeadingProps) {
  return (
    <header className="page-heading">
      <div className="page-heading-left">
        <h1 className="kicker page-heading-kicker">{kicker}</h1>
        {belowKicker && <div className="page-heading-content">{belowKicker}</div>}
      </div>
      {actions && <div className="page-heading-actions">{actions}</div>}
    </header>
  )
}
