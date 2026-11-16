import api from './api';
import { SAMPLE_PROPERTIES } from '../data/sampleProperties';

// Must match REST_FRAMEWORK['PAGE_SIZE'] in backend-django/config/settings.py
export const PAGE_SIZE = 12;

const USE_SAMPLE_DATA = import.meta.env.VITE_USE_SAMPLE_DATA === 'true';

// Fall back to sample data only when the Django server cannot be reached
// (or the endpoint is missing), and only if sample data is enabled.
// As soon as the API answers, its real data is shown instead.
const shouldUseSample = (error) =>
  USE_SAMPLE_DATA && (!error.response || error.response.status === 404);

// Query parameters understood by GET /api/properties/
export const FILTER_KEYS = [
  'listing_type', 'category', 'property_type', 'city', 'locality', 'search',
  'min_price', 'max_price', 'min_area', 'max_area', 'bedrooms', 'bathrooms',
  'furnishing_status', 'featured', 'ordering', 'page', 'page_size',
];

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([key, v]) => FILTER_KEYS.includes(key) && v !== '' && v != null),
  );

function querySampleProperties(params) {
  const search = (params.search || '').trim().toLowerCase();
  const min = (key, value) => !params[key] || (value ?? 0) >= Number(params[key]);
  const max = (key, value) => !params[key] || (value ?? 0) <= Number(params[key]);
  let results = SAMPLE_PROPERTIES.filter((p) => {
    for (const key of ['listing_type', 'category', 'property_type', 'city', 'locality', 'furnishing_status']) {
      if (params[key] && p[key] !== params[key]) return false;
    }
    if (!min('min_price', p.price) || !max('max_price', p.price)) return false;
    if (!min('min_area', p.area_sqft) || !max('max_area', p.area_sqft)) return false;
    if (!min('bedrooms', p.bedrooms) || !min('bathrooms', p.bathrooms)) return false;
    if (params.featured === 'true' && !p.featured) return false;
    if (search) {
      const haystack = `${p.title} ${p.locality_name} ${p.address} ${p.description}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const ordering = params.ordering || '-created_at';
  const field = ordering.replace('-', '');
  const direction = ordering.startsWith('-') ? -1 : 1;
  results = [...results].sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * direction);

  const size = Number(params.page_size) || PAGE_SIZE;
  const page = Math.max(1, Number(params.page) || 1);
  const start = (page - 1) * size;
  return {
    count: results.length,
    next: start + size < results.length ? page + 1 : null,
    previous: page > 1 ? page - 1 : null,
    results: results.slice(start, start + size),
  };
}

export class NotFoundError extends Error {}

/** List properties. Returns DRF pagination shape plus `isSample`. */
export async function fetchProperties(params = {}) {
  const query = cleanParams(params);
  try {
    const { data } = await api.get('/properties/', { params: query });
    return { ...data, isSample: false };
  } catch (error) {
    if (shouldUseSample(error)) return { ...querySampleProperties(query), isSample: true };
    throw error;
  }
}

/** Get one property by slug. Throws NotFoundError when it does not exist. */
export async function fetchProperty(slug) {
  try {
    const { data } = await api.get(`/properties/${encodeURIComponent(slug)}/`);
    return { property: data, isSample: false };
  } catch (error) {
    if (!error.response && USE_SAMPLE_DATA) {
      const property = SAMPLE_PROPERTIES.find((p) => p.slug === slug);
      if (property) return { property, isSample: true };
    }
    if (error.response?.status === 404 || (!error.response && USE_SAMPLE_DATA)) {
      throw new NotFoundError('Property not found');
    }
    throw error;
  }
}
