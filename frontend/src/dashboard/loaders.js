import adminApi from './adminApi';
import { propertyLocation } from '../utils/format';

export const loadCustomers = (search) =>
  adminApi.get('/customers/', { params: { search, page_size: 10 } })
    .then(({ data }) => data.results.map((c) => ({ value: c.id, label: c.name, sub: c.phone })));

export const loadProperties = (search) =>
  adminApi.get('/properties/', { params: { search, page_size: 10 } })
    .then(({ data }) => data.results.map((p) => ({ value: p.id, label: p.title, sub: `${propertyLocation(p)} · ${p.status}` })));
