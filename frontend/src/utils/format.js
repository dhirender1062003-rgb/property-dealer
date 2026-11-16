import { AREA_UNITS, LISTING_TYPE_MAP } from '../constants/options';

const trimZeros = (n) => Number(n.toFixed(2)).toString();

// Indian-style short price: ₹1.25 Cr, ₹85 Lac, ₹24,000
export function formatPrice(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 'Price on request';
  if (value >= 1e7) return `₹${trimZeros(value / 1e7)} Cr`;
  if (value >= 1e5) return `₹${trimZeros(value / 1e5)} Lac`;
  return `₹${value.toLocaleString('en-IN')}`;
}

export function formatPropertyPrice(property) {
  const price = formatPrice(property.price);
  return property.price_period === 'month' && Number(property.price) > 0 ? `${price}/month` : price;
}

// Area in the unit it was listed in: "1,650 sq.ft", "200 sq.yd", "1 acre"
export function formatArea(property) {
  const value = Number(property.area ?? property.area_sqft);
  if (!(value > 0)) return null;
  const unit = AREA_UNITS[property.area_unit] ?? 'sq.ft';
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}`;
}

export const listingBadge = (value) => LISTING_TYPE_MAP[value]?.badge ?? value;

export const propertyTypeLabel = (property) =>
  property.property_type_display || property.property_type?.replace(/_/g, ' ');

export const propertyLocation = (property) =>
  [property.locality_name, property.city_name].filter(Boolean).join(', ');

export const telLink = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

export const whatsappLink = (number, text = '') => {
  const digits = String(number).replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
