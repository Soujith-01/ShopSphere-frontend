import Spinner from './Spinner.jsx'

export default function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading-state" role="status">
      <Spinner />
      <span className="muted">{label}</span>
    </div>
  )
}
