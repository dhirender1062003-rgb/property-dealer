import { Link } from 'react-router-dom';
import { Bath, BedDouble, Building2, MapPin, Maximize } from 'lucide-react';
import PropertyImage from './PropertyImage';
import {
  formatArea, formatPropertyPrice, listingBadge, propertyLocation, propertyTypeLabel,
} from '../utils/format';

export default function PropertyCard({ property }) {
  const url = `/properties/${property.slug}`;
  const area = formatArea(property);

  return (
    <article className="property-card">
      <Link to={url} className="property-card__media" tabIndex={-1} aria-hidden="true">
        <PropertyImage src={property.primary_image ?? property.images?.[0]?.image} alt={property.title} />
        <div className="property-card__badges">
          <span className={`badge badge--${property.listing_type}`}>{listingBadge(property.listing_type)}</span>
          {property.featured && <span className="badge badge--featured">Featured</span>}
        </div>
        {property.is_sample && (
          <span className="badge badge--sample property-card__sample" title="Sample listing for development">
            Sample
          </span>
        )}
      </Link>

      <div className="property-card__body">
        <p className="property-card__price">{formatPropertyPrice(property)}</p>
        <h3 className="property-card__title">
          <Link to={url}>{property.title}</Link>
        </h3>
        <p className="property-card__location">
          <MapPin size={15} /> {propertyLocation(property)}
        </p>

        <ul className="property-card__facts">
          {property.bedrooms > 0 && (
            <li><BedDouble size={16} /> {property.bedrooms} BHK</li>
          )}
          {property.bathrooms > 0 && (
            <li><Bath size={16} /> {property.bathrooms} Bath</li>
          )}
          {area && (
            <li><Maximize size={16} /> {area}</li>
          )}
          {!(property.bedrooms > 0) && (
            <li><Building2 size={16} /> {propertyTypeLabel(property)}</li>
          )}
        </ul>
      </div>
    </article>
  );
}
