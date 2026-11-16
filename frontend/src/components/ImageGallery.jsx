import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PropertyImage from './PropertyImage';

const SWIPE_DISTANCE = 40; // px a finger must travel to change photo

export default function ImageGallery({ images = [], title }) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef(null);
  const count = images.length;

  if (count === 0) {
    return (
      <div className="gallery">
        <div className="gallery__main">
          <PropertyImage src={null} alt={title} />
        </div>
      </div>
    );
  }

  const go = (delta) => setIndex((i) => (i + delta + count) % count);
  const current = images[index];

  // Swipe left/right on touch screens (vertical scrolling is left alone).
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchStart.current || count < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  return (
    <div
      className="gallery"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      }}
    >
      <div className="gallery__main" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <PropertyImage
          key={current.image}
          src={current.image}
          alt={current.alt_text || `${title} — photo ${index + 1}`}
          loading="eager"
        />
        {count > 1 && (
          <>
            <button type="button" className="gallery__nav gallery__nav--prev" onClick={() => go(-1)} aria-label="Previous photo">
              <ChevronLeft size={24} />
            </button>
            <button type="button" className="gallery__nav gallery__nav--next" onClick={() => go(1)} aria-label="Next photo">
              <ChevronRight size={24} />
            </button>
            <span className="gallery__counter" aria-live="polite">{index + 1} / {count}</span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="gallery__thumbs">
          {images.map((img, i) => (
            <button
              key={img.id ?? img.image}
              type="button"
              className={`gallery__thumb ${i === index ? 'is-active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
            >
              <PropertyImage src={img.image} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
