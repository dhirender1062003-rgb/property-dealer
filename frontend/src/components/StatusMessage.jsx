import { Info, LoaderCircle, TriangleAlert } from 'lucide-react';

export function Loader({ label = 'Loading…' }) {
  return (
    <div className="status status--loading" role="status">
      <LoaderCircle className="spin" size={32} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="status status--error" role="alert">
      <TriangleAlert size={32} />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn--navy" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, children }) {
  return (
    <div className="status status--empty">
      <Info size={32} />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}
