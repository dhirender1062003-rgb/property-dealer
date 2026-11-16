import { Info } from 'lucide-react';

// Shown whenever the listings on screen come from the development sample data.
export default function SampleDataNotice() {
  return (
    <div className="sample-notice" role="note">
      <Info size={18} />
      <p>
        <strong>Sample data:</strong> these are demo listings for development only. Real properties will
        appear here once they are added through the admin panel.
      </p>
    </div>
  );
}
