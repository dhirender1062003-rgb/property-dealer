import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <section className="section">
      <div className="container not-found">
        <span className="not-found__code">404</span>
        <h1>Page not found</h1>
        <p>The page you are looking for doesn&apos;t exist or has been moved.</p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn--gold">Go to Homepage</Link>
          <Link to="/properties" className="btn btn--outline">Browse Properties</Link>
        </div>
      </div>
    </section>
  );
}
