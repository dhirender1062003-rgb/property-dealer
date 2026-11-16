import { useState } from 'react';
import { ImageOff } from 'lucide-react';

// Image that shows a branded placeholder if the photo is missing or fails to load.
export default function PropertyImage({ src, alt, className = '', loading = 'lazy' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`image-fallback ${className}`} role="img" aria-label={alt}>
        <ImageOff size={32} />
        <span>Photo not available</span>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} />;
}
