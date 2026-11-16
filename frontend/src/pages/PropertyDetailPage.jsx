import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Bath, BedDouble, Building2, CalendarCheck, Car, Check, ChevronRight, Compass, Copy, Hourglass, Layers,
  MapPin, Maximize, MessageCircle, Phone, Share2, Sofa,
} from 'lucide-react';
import ImageGallery from '../components/ImageGallery';
import InquiryForm from '../components/InquiryForm';
import PropertyCard from '../components/PropertyCard';
import SampleDataNotice from '../components/SampleDataNotice';
import SectionHeading from '../components/SectionHeading';
import { EmptyState, ErrorState, Loader } from '../components/StatusMessage';
import { FURNISHING, POSSESSION } from '../constants/options';
import { useProperties, useProperty } from '../hooks/useProperties';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useTaxonomy } from '../context/TaxonomyContext';
import { NotFoundError } from '../services/properties';
import {
  formatArea, formatPropertyPrice, listingBadge, propertyLocation, propertyTypeLabel,
  telLink, whatsappLink,
} from '../utils/format';

const floorLabel = (floor, total) => {
  if (floor == null) return total ? `${total} floors` : null;
  const name = floor === 0 ? 'Ground' : `${floor}`;
  return total ? `${name} of ${total}` : name;
};

function ShareButton({ title }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User closed the share sheet.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <button type="button" className="btn btn--outline btn--sm" onClick={share}>
      {copied ? <><Check size={16} /> Link copied</> : <>{navigator.share ? <Share2 size={16} /> : <Copy size={16} />} Share</>}
    </button>
  );
}

function SimilarProperties({ property }) {
  const { data } = useProperties({ city: property.city });
  // Same city; properties with the same listing type (buy/rent/lease) come first.
  const similar = (data?.results ?? [])
    .filter((p) => p.id !== property.id)
    .sort((a, b) => (b.listing_type === property.listing_type) - (a.listing_type === property.listing_type))
    .slice(0, 3);
  if (similar.length === 0) return null;

  return (
    <section className="section section--tint">
      <div className="container">
        <SectionHeading
          eyebrow="You may also like"
          title={`Similar Properties in ${property.city_name}`}
        />
        <div className="property-grid">
          {similar.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PropertyDetailPage() {
  const { slug } = useParams();
  const settings = useSiteSettings();
  const { categoryMap } = useTaxonomy();
  const { data, loading, error, retry } = useProperty(slug);
  const property = data?.property;
  useDocumentTitle(property ? property.title : loading ? 'Loading property' : 'Property not found');

  if (loading) {
    return <div className="container section"><Loader label="Loading property…" /></div>;
  }

  if (error instanceof NotFoundError) {
    return (
      <div className="container section">
        <EmptyState title="Property not found" message="This property may have been sold, rented out or removed.">
          <Link to="/properties" className="btn btn--navy">Browse all properties</Link>
        </EmptyState>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container section">
        <ErrorState message="We couldn't load this property." onRetry={retry} />
      </div>
    );
  }

  const facts = [
    property.bedrooms > 0 && { icon: BedDouble, label: 'Bedrooms', value: `${property.bedrooms} BHK` },
    property.bathrooms > 0 && { icon: Bath, label: 'Bathrooms', value: property.bathrooms },
    formatArea(property) && { icon: Maximize, label: 'Area', value: formatArea(property) },
    { icon: Building2, label: 'Property Type', value: propertyTypeLabel(property) },
    property.furnishing_status && { icon: Sofa, label: 'Furnishing', value: FURNISHING[property.furnishing_status] ?? property.furnishing_status },
    floorLabel(property.floor, property.total_floors) && { icon: Layers, label: 'Floor', value: floorLabel(property.floor, property.total_floors) },
    property.facing && { icon: Compass, label: 'Facing', value: property.facing },
    property.parking > 0 && { icon: Car, label: 'Parking', value: `${property.parking}` },
    property.possession_status && { icon: CalendarCheck, label: 'Possession', value: POSSESSION[property.possession_status] ?? property.possession_status },
    property.property_age && { icon: Hourglass, label: 'Age', value: property.property_age },
  ].filter(Boolean);

  const whatsappText = `Hi, I am interested in "${property.title}" (${propertyLocation(property)}). ${window.location.href}`;

  return (
    <>
      <div className="container detail-top">
        <nav className="breadcrumb breadcrumb--dark" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={14} />
          <Link to="/properties">Properties</Link>
          <ChevronRight size={14} />
          <Link to={`/properties?city=${property.city}`}>{property.city_name}</Link>
          <ChevronRight size={14} />
          <span aria-current="page">{property.title}</span>
        </nav>
        {data.isSample && <SampleDataNotice />}
      </div>

      <section className="section section--flush-top">
        <div className="container detail-layout">
          <div className="detail-main">
            <ImageGallery images={property.images} title={property.title} />

            <div className="detail-header">
              <div className="detail-header__badges">
                <span className={`badge badge--${property.listing_type}`}>{listingBadge(property.listing_type)}</span>
                <span className="badge badge--outline">{categoryMap[property.category]?.label ?? property.category}</span>
                {property.featured && <span className="badge badge--featured">Featured</span>}
                {property.is_sample && <span className="badge badge--sample">Sample</span>}
              </div>
              <h1>{property.title}</h1>
              <p className="detail-header__location">
                <MapPin size={18} /> {property.address || propertyLocation(property)}
              </p>
              <div className="detail-header__price-row">
                <p className="detail-header__price">{formatPropertyPrice(property)}</p>
                <ShareButton title={property.title} />
              </div>
            </div>

            <div className="detail-card">
              <h2>Property Overview</h2>
              <ul className="fact-grid">
                {facts.map(({ icon: Icon, label, value }) => (
                  <li key={label} className="fact">
                    <span className="fact__icon"><Icon size={20} /></span>
                    <span>
                      <span className="fact__label">{label}</span>
                      <span className="fact__value">{value}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {property.description && (
              <div className="detail-card">
                <h2>Description</h2>
                <p className="detail-description">{property.description}</p>
              </div>
            )}

            {property.amenities?.length > 0 && (
              <div className="detail-card">
                <h2>Amenities &amp; Features</h2>
                <ul className="amenity-list">
                  {property.amenities.map((a) => (
                    <li key={a.id ?? a.name}><Check size={16} /> {a.name}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="detail-card">
              <h2>Location</h2>
              <dl className="location-details">
                <div><dt>Locality</dt><dd>{property.locality_name || '—'}</dd></div>
                <div><dt>City</dt><dd>{property.city_name}</dd></div>
                {property.address && <div><dt>Address</dt><dd>{property.address}</dd></div>}
              </dl>
              <a
                className="btn btn--outline btn--sm"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address || propertyLocation(property))}`}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={16} /> View on Google Maps
              </a>
            </div>
          </div>

          <aside className="detail-sidebar">
            <div className="detail-card detail-card--sticky">
              <p className="detail-sidebar__price">{formatPropertyPrice(property)}</p>
              <h2>Interested in this property?</h2>
              <p className="detail-sidebar__hint">Send an enquiry and our team will contact you.</p>
              <div className="detail-sidebar__quick">
                {settings.phone && (
                  <a href={telLink(settings.phone)} className="btn btn--navy">
                    <Phone size={18} /> Call
                  </a>
                )}
                {settings.whatsapp && (
                  <a href={whatsappLink(settings.whatsapp, whatsappText)} className="btn btn--whatsapp" target="_blank" rel="noreferrer">
                    <MessageCircle size={18} /> WhatsApp
                  </a>
                )}
              </div>
              <InquiryForm key={property.id} property={property} compact />
            </div>
          </aside>
        </div>
      </section>

      <SimilarProperties property={property} />
    </>
  );
}
