// Option lists shared by search, filters and property pages.
// The `value` strings match the Django API.
//
// Cities, localities and property types are loaded from Django
// (/api/cities/, /api/categories/) by TaxonomyContext. The lists below are
// only a fallback used while the API cannot be reached.

export const LISTING_TYPES = [
  { value: 'buy', label: 'Buy', badge: 'For Sale' },
  { value: 'rent', label: 'Rent', badge: 'For Rent' },
  { value: 'lease', label: 'Lease', badge: 'For Lease' },
];

export const FALLBACK_CATEGORIES = [
  {
    value: 'residential',
    label: 'Residential',
    property_types: [
      { value: 'flat', label: 'Flat' },
      { value: 'apartment', label: 'Apartment' },
      { value: 'independent_house', label: 'Independent House' },
      { value: 'villa', label: 'Villa' },
      { value: 'builder_floor', label: 'Builder Floor' },
      { value: 'residential_plot', label: 'Residential Plot' },
      { value: 'farm_house', label: 'Farm House' },
    ],
  },
  {
    value: 'commercial',
    label: 'Commercial',
    property_types: [
      { value: 'shop', label: 'Shop' },
      { value: 'showroom', label: 'Showroom' },
      { value: 'office', label: 'Office' },
      { value: 'commercial_building', label: 'Commercial Building' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'industrial', label: 'Industrial Property' },
      { value: 'commercial_plot', label: 'Commercial Plot' },
    ],
  },
];

const loc = (name) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });

export const FALLBACK_CITIES = [
  {
    name: 'Ghaziabad',
    slug: 'ghaziabad',
    description: 'Indirapuram, Vaishali, Raj Nagar Extension, Crossings Republik and all of Ghaziabad.',
    localities: ['Raj Nagar', 'Kavi Nagar', 'Raj Nagar Extension', 'Indirapuram', 'Vaishali', 'Vasundhara',
      'Crossings Republik', 'Kaushambi', 'NH-24'].map(loc),
  },
  {
    name: 'Noida',
    slug: 'noida',
    description: 'All Noida sectors from Sector 1 to Sector 150, including the Noida Expressway.',
    localities: ['Noida Expressway', 'Sector 18', 'Sector 50', 'Sector 62', 'Sector 63', 'Sector 75',
      'Sector 137', 'Sector 150'].map(loc),
  },
  {
    name: 'Greater Noida',
    slug: 'greater-noida',
    description: 'Greater Noida, Greater Noida West (Noida Extension), Techzone, Gaur City and more.',
    localities: ['Alpha', 'Knowledge Park', 'Pari Chowk', 'Chi', 'Greater Noida West', 'Noida Extension',
      'Techzone', 'Gaur City'].map(loc),
  },
];

// Photos for the "Areas We Serve" cards when a city has no photo in admin.
const photo = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;
export const CITY_IMAGES = {
  ghaziabad: photo('1545324418-cc1a3fa10c00'),
  noida: photo('1486406146926-c627a92ad1ab'),
  'greater-noida': photo('1582268611958-ebfd161ef9cf'),
};
export const DEFAULT_CITY_IMAGE = photo('1574362848149-11496d93a7c7');

export const BEDROOM_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+ BHK` }));
export const BATHROOM_OPTIONS = [1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n}+ Baths` }));

export const FURNISHING_OPTIONS = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi_furnished', label: 'Semi-Furnished' },
  { value: 'fully_furnished', label: 'Fully Furnished' },
];
export const FURNISHING = Object.fromEntries(FURNISHING_OPTIONS.map((o) => [o.value, o.label]));

export const POSSESSION = {
  ready: 'Ready to Move',
  under_construction: 'Under Construction',
};

export const AREA_UNITS = {
  sqft: 'sq.ft',
  sqyd: 'sq.yd',
  sqm: 'sq.m',
  acre: 'acre',
};

export const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: 'area_sqft', label: 'Area: Low to High' },
];

// Area filter choices, in square feet.
export const AREA_OPTIONS = [500, 1000, 1500, 2000, 3000, 5000, 10000, 25000].map((n) => ({
  value: String(n),
  label: `${n.toLocaleString('en-IN')} sq.ft`,
}));

// Budget choices in rupees. Sale prices are totals; rent/lease prices are per month.
export const BUDGETS = {
  buy: [
    { value: '2500000', label: '₹25 Lac' },
    { value: '5000000', label: '₹50 Lac' },
    { value: '7500000', label: '₹75 Lac' },
    { value: '10000000', label: '₹1 Cr' },
    { value: '20000000', label: '₹2 Cr' },
    { value: '50000000', label: '₹5 Cr' },
    { value: '100000000', label: '₹10 Cr' },
  ],
  monthly: [
    { value: '10000', label: '₹10,000' },
    { value: '25000', label: '₹25,000' },
    { value: '50000', label: '₹50,000' },
    { value: '100000', label: '₹1 Lac' },
    { value: '250000', label: '₹2.5 Lac' },
    { value: '500000', label: '₹5 Lac' },
    { value: '1000000', label: '₹10 Lac' },
  ],
};

export const budgetsFor = (listingType) =>
  listingType === 'rent' || listingType === 'lease' ? BUDGETS.monthly : BUDGETS.buy;

// Budget ranges offered in the enquiry form.
export const INQUIRY_BUDGETS = {
  buy: ['Below ₹50 Lac', '₹50 Lac - ₹1 Cr', '₹1 Cr - ₹2 Cr', '₹2 Cr - ₹5 Cr', 'Above ₹5 Cr'],
  monthly: ['Below ₹25,000/month', '₹25,000 - ₹50,000/month', '₹50,000 - ₹1 Lac/month',
    '₹1 Lac - ₹5 Lac/month', 'Above ₹5 Lac/month'],
};

export const INQUIRY_TYPES = [
  { value: 'buy', label: 'I want to buy' },
  { value: 'rent', label: 'I want to rent' },
  { value: 'lease', label: 'I want to lease' },
  { value: 'sell', label: 'I want to sell my property' },
  { value: 'rent_out', label: 'I want to rent out / lease out my property' },
  { value: 'other', label: 'Something else' },
];

export const LISTING_TYPE_MAP = Object.fromEntries(LISTING_TYPES.map((item) => [item.value, item]));
