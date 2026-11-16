import { useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  AREA_OPTIONS, BATHROOM_OPTIONS, BEDROOM_OPTIONS, FURNISHING_OPTIONS, LISTING_TYPES, budgetsFor,
} from '../constants/options';
import { useTaxonomy } from '../context/TaxonomyContext';

function ChipGroup({ label, value, options, onSelect }) {
  return (
    <fieldset className="filter-group">
      <legend>{label}</legend>
      <div className="chip-group">
        <button type="button" className={`chip ${!value ? 'is-active' : ''}`} aria-pressed={!value} onClick={() => onSelect('')}>
          All
        </button>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`chip ${value === o.value ? 'is-active' : ''}`}
            aria-pressed={value === o.value}
            onClick={() => onSelect(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function RangeSelect({ label, minKey, maxKey, options, values, onChange }) {
  return (
    <div className="filter-group">
      <span className="field__label">{label}</span>
      <div className="filter-row">
        <select aria-label={`Minimum ${label.toLowerCase()}`} value={values[minKey] || ''}
                onChange={(e) => onChange({ [minKey]: e.target.value })}>
          <option value="">Min</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select aria-label={`Maximum ${label.toLowerCase()}`} value={values[maxKey] || ''}
                onChange={(e) => onChange({ [maxKey]: e.target.value })}>
          <option value="">Max</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}

function SelectFilter({ label, value, onChange, placeholder, options }) {
  return (
    <label className="field filter-group">
      <span className="field__label">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// Sidebar filters for the listing page. Every change is applied immediately
// through `onChange(updates)`; the keyword applies when the user submits it.
export default function FilterPanel({ values, onChange, onReset, onClose }) {
  const { cities, categories, propertyTypes, localitiesFor } = useTaxonomy();
  const [keyword, setKeyword] = useState(values.search || '');

  // Keep the keyword box in sync when the URL changes (e.g. "Clear all").
  const [lastSearch, setLastSearch] = useState(values.search);
  if (values.search !== lastSearch) {
    setLastSearch(values.search);
    setKeyword(values.search || '');
  }

  const types = propertyTypes.filter((t) => !values.category || t.category === values.category);
  const localities = localitiesFor(values.city);
  const isMonthly = values.listing_type === 'rent' || values.listing_type === 'lease';
  const isCommercial = values.category === 'commercial';

  const submitKeyword = (event) => {
    event.preventDefault();
    onChange({ search: keyword.trim() });
  };

  return (
    <aside className="filter-panel" aria-label="Property filters">
      <div className="filter-panel__head">
        <h2>Filter Properties</h2>
        {onClose && (
          <button type="button" className="icon-btn" aria-label="Close filters" onClick={onClose}>
            <X size={22} />
          </button>
        )}
      </div>

      <form className="filter-panel__search" onSubmit={submitKeyword} role="search">
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Locality or keyword"
          aria-label="Search by locality or keyword"
          enterKeyHint="search"
        />
        <button type="submit" className="btn btn--navy" aria-label="Search">
          <Search size={18} />
        </button>
      </form>

      <ChipGroup label="Looking to" value={values.listing_type} options={LISTING_TYPES}
                 onSelect={(v) => onChange({ listing_type: v })} />
      <ChipGroup label="Category" value={values.category} options={categories}
                 onSelect={(v) => onChange({ category: v })} />

      <SelectFilter label="Property Type" value={values.property_type} placeholder="All Types" options={types}
                    onChange={(v) => onChange({ property_type: v })} />

      <SelectFilter label="City" value={values.city} placeholder="All Locations"
                    options={cities.map((c) => ({ value: c.slug, label: c.name }))}
                    onChange={(v) => onChange({ city: v, locality: '' })} />

      {values.city && localities.length > 0 && (
        <SelectFilter label="Locality / Sector" value={values.locality} placeholder="All localities"
                      options={localities.map((l) => ({ value: l.slug, label: l.name }))}
                      onChange={(v) => onChange({ locality: v })} />
      )}

      <RangeSelect label={isMonthly ? 'Rent per Month' : 'Budget'} minKey="min_price" maxKey="max_price"
                   options={budgetsFor(values.listing_type)} values={values} onChange={onChange} />
      {!values.listing_type && (
        <p className="field__hint filter-hint">Choose Buy, Rent or Lease for more accurate budget ranges.</p>
      )}

      <RangeSelect label="Area" minKey="min_area" maxKey="max_area" options={AREA_OPTIONS}
                   values={values} onChange={onChange} />

      {!isCommercial && (
        <SelectFilter label="Bedrooms" value={values.bedrooms} placeholder="Any" options={BEDROOM_OPTIONS}
                      onChange={(v) => onChange({ bedrooms: v })} />
      )}

      <SelectFilter label="Bathrooms" value={values.bathrooms} placeholder="Any" options={BATHROOM_OPTIONS}
                    onChange={(v) => onChange({ bathrooms: v })} />

      <SelectFilter label="Furnishing" value={values.furnishing_status} placeholder="Any"
                    options={FURNISHING_OPTIONS} onChange={(v) => onChange({ furnishing_status: v })} />

      <div className="filter-panel__actions">
        <button type="button" className="btn btn--outline btn--block" onClick={onReset}>
          Clear all filters
        </button>
        {onClose && (
          <button type="button" className="btn btn--gold btn--block" onClick={onClose}>
            Show results
          </button>
        )}
      </div>
    </aside>
  );
}
