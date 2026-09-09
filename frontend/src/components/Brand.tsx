type BrandProps = { onNavigate: (path: string) => void }

export function Brand({ onNavigate }: BrandProps) {
  return (
    <button className="brand" type="button" onClick={() => onNavigate('/')} aria-label="Toolbox inventory">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>Toolbox</span>
    </button>
  )
}
