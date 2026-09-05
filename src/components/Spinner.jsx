export default function Spinner({ small = false }) {
  return <span className={`spinner${small ? ' spinner-sm' : ''}`} aria-hidden="true" />
}
