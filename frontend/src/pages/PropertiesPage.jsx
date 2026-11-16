import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import PageBanner from '../components/PageBanner';
import FilterPanel from '../components/FilterPanel';
import PropertyCard from '../components/PropertyCard';
import Pagination from '../components/Pagination';
import SampleDataNotice from '../components/SampleDataNotice';
import { EmptyState, ErrorState, Loader } from '../components/StatusMessage';
import {
  BATHROOM_OPTIONS, BEDROOM_OPTIONS, FURNISHING, LISTING_TYPE_MAP, SORT_OPTIONS,
} from '../constants/options';
import { FILTER_KEYS, PAGE_SIZE } from '../services/properties';
import { useProperties } from '../hooks/useProperties';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useTaxonomy } from '../context/TaxonomyContext';
import { formatPrice } from '../utils/format';

const sqft = (value) => `${Number(value).toLocaleString('en-IN')} sq.ft`;
const plural = (label) => (label.endsWith('Property') ? label.replace(/Property$/, 'Properties') : `${label}s`);

// "Properties for Rent in Noida", "Commercial Properties for Lease", etc.
function buildTitle(f, tax) {
  const what = tax.typeMap[f.property_type]
    ? plural(tax.typeMap[f.property_type].label)
    : f.category
      ? `${tax.categoryMap[f.category]?.label ?? ''} Properties`
      : 'Properties';
  const purpose = f.listing_type
    ? ` for ${f.listing_type === 'buy' ? 'Sale' : LISTING_TYPE_MAP[f.listing_type]?.label}`
    : '';
  const locality = tax.localitiesFor(f.city).find((l) => l.slug === f.locality)?.name;
  const city = tax.cityMap[f.city]?.name;
  const where = locality ? ` in ${locality}, ${city}` : city ? ` in ${city}` : ' in Noida & Ghaziabad';
  return `${what}${purpose}${where}`;
}

function activeChips(f, tax) {
  const chips = [
    ['listing_type', LISTING_TYPE_MAP[f.listing_type]?.label],
    ['category', tax.categoryMap[f.category]?.label],
    ['property_type', tax.typeMap[f.property_type]?.label],
    ['city', tax.cityMap[f.city]?.name],
    ['locality', tax.localitiesFor(f.city).find((l) => l.slug === f.locality)?.name],
    ['search', f.search && `“${f.search}”`],
    ['min_price', f.min_price && `Min ${formatPrice(f.min_price)}`],
    ['max_price', f.max_price && `Max ${formatPrice(f.max_price)}`],
    ['min_area', f.min_area && `Min ${sqft(f.min_area)}`],
    ['max_area', f.max_area && `Max ${sqft(f.max_area)}`],
    ['bedrooms', BEDROOM_OPTIONS.find((b) => b.value === f.bedrooms)?.label],
    ['bathrooms', BATHROOM_OPTIONS.find((b) => b.value === f.bathrooms)?.label],
    ['furnishing_status', FURNISHING[f.furnishing_status]],
  ];
  return chips.filter(([, label]) => label).map(([key, label]) => ({ key, label }));
}

export default function PropertiesPage() {
  const tax = useTaxonomy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The URL is the single source of truth for filters, so results can be shared or bookmarked.
  const filters = useMemo(() => {
    const f = {};
    FILTER_KEYS.forEach((key) => {
      const value = searchParams.get(key);
      if (value) f[key] = value;
    });
    return f;
  }, [searchParams]);

  const page = Math.max(1, Number(filters.page) || 1);
  const { data, loading, error, retry } = useProperties(filters);
  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;
  const title = buildTitle(filters, tax);
  useDocumentTitle(title);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', filtersOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [filtersOpen]);

  const updateFilters = (updates) => {
    const next = { ...filters, ...updates };
    // Sale prices and monthly rents use different scales, so reset the budget.
    if ('listing_type' in updates && updates.listing_type !== filters.listing_type) {
      delete next.min_price;
      delete next.max_price;
    }
    // Drop a property type that doesn't belong to the newly chosen category.
    if (updates.category && next.property_type && tax.typeMap[next.property_type]?.category !== updates.category) {
      delete next.property_type;
    }
    if (updates.category === 'commercial') delete next.bedrooms;
    // Choosing a property type implies its category.
    if (updates.property_type) next.category = tax.typeMap[updates.property_type]?.category;
    // Removing the city also removes its locality.
    if ('city' in updates && !updates.city) delete next.locality;
    if (!('page' in updates)) delete next.page; // new filters start at page 1

    setSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
  };

  const resetFilters = () => setSearchParams({});

  const changePage = (p) => {
    updateFilters({ page: p > 1 ? String(p) : '' });
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const chips = activeChips(filters, tax);

  return (
    <>
      <PageBanner
        title={title}
        subtitle="Search and filter listings across Ghaziabad, Noida and Greater Noida."
        crumbs={[{ label: 'Properties' }]}
      />

      <section className="section section--tight">
        <div className="container listing-layout">
          <div className={`listing-layout__filters ${filtersOpen ? 'is-open' : ''}`}>
            <FilterPanel
              values={filters}
              onChange={updateFilters}
              onReset={resetFilters}
              onClose={filtersOpen ? () => setFiltersOpen(false) : undefined}
            />
          </div>
          {filtersOpen && <div className="drawer-backdrop" onClick={() => setFiltersOpen(false)} aria-hidden="true" />}

          <div className="listing-layout__results" id="results">
            <div className="results-bar">
              <p className="results-bar__count" aria-live="polite">
                {loading ? 'Searching…' : data ? `${data.count} ${data.count === 1 ? 'property' : 'properties'} found` : ''}
              </p>
              <div className="results-bar__controls">
                <button type="button" className="btn btn--outline results-bar__filter-btn" onClick={() => setFiltersOpen(true)}>
                  <SlidersHorizontal size={18} /> Filters{chips.length > 0 && ` (${chips.length})`}
                </button>
                <label className="results-bar__sort">
                  <span>Sort by</span>
                  <select value={filters.ordering || '-created_at'} onChange={(e) => updateFilters({ ordering: e.target.value })}>
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {chips.length > 0 && (
              <div className="active-filters">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="active-filter"
                    onClick={() => updateFilters({ [chip.key]: '' })}
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    {chip.label} <X size={14} />
                  </button>
                ))}
                <button type="button" className="link-btn" onClick={resetFilters}>Clear all</button>
              </div>
            )}

            {data?.isSample && <SampleDataNotice />}

            {loading && <Loader label="Loading properties…" />}
            {error && (
              <ErrorState
                message={error.response?.status === 400
                  ? 'Some filters are not valid. Please clear the filters and try again.'
                  : "We couldn't load properties. Please check your connection."}
                onRetry={retry}
              />
            )}
            {!loading && !error && data?.results.length === 0 && (
              <EmptyState title="No properties match your filters" message="Try removing a filter or widening your budget.">
                <button type="button" className="btn btn--navy" onClick={resetFilters}>Clear all filters</button>
              </EmptyState>
            )}

            {!loading && data?.results.length > 0 && (
              <>
                <div className="property-grid property-grid--listing">
                  {data.results.map((p) => (
                    <PropertyCard key={p.id} property={p} />
                  ))}
                </div>
                <Pagination page={page} totalPages={totalPages} onChange={changePage} />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
