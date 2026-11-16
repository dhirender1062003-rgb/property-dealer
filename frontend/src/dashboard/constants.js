// Choice lists matching the Django models.

export const PROPERTY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
  { value: 'rented', label: 'Rented' },
  { value: 'leased', label: 'Leased' },
  { value: 'draft', label: 'Draft (hidden)' },
];

export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'site_visit', label: 'Site Visit Scheduled' },
  { value: 'converted', label: 'Converted (Deal Done)' },
  { value: 'closed', label: 'Closed' },
  { value: 'lost', label: 'Lost' },
  { value: 'spam', label: 'Spam' },
];

export const FINISHED_LEAD_STATUSES = ['converted', 'closed', 'lost', 'spam'];

export const VISIT_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

export const AREA_UNIT_OPTIONS = [
  { value: 'sqft', label: 'Sq. Ft.' },
  { value: 'sqyd', label: 'Sq. Yard' },
  { value: 'sqm', label: 'Sq. Metre' },
  { value: 'acre', label: 'Acre' },
];

export const FACING_OPTIONS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East',
  'South-West', 'Main Road'].map((v) => ({ value: v, label: v }));

export const AGE_OPTIONS = [
  { value: '0-1 years', label: 'New (0-1 years)' },
  { value: '1-5 years', label: '1-5 years' },
  { value: '5-10 years', label: '5-10 years' },
  { value: '10+ years', label: '10+ years' },
];

export const POSSESSION_OPTIONS = [
  { value: 'ready', label: 'Ready to Move' },
  { value: 'under_construction', label: 'Under Construction' },
];

export const SOCIAL_NETWORKS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X (Twitter)' },
];

export const labelOf = (options, value) => options.find((o) => o.value === value)?.label ?? value ?? '—';
