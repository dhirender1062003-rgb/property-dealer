import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { LISTING_TYPES, budgetsFor } from '../constants/options';
import { useTaxonomy } from '../context/TaxonomyContext';

// Homepage search box. Submitting opens the listing page with the chosen filters.
export default function HeroSearch() {
  const navigate = useNavigate();
  const { cities, categories, categoryMap } = useTaxonomy();
  const [listingType, setListingType] = useState('buy');
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [keyword, setKeyword] = useState('');

  const changeListingType = (value) => {
    setListingType(value);
    setMaxPrice(''); // sale and monthly budgets use different scales
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams({ listing_type: listingType });
    if (city) params.set('city', city);
    // "type" may be a whole category (residential/commercial) or a single property type
    if (categoryMap[type]) params.set('category', type);
    else if (type) params.set('property_type', type);
    if (maxPrice) params.set('max_price', maxPrice);
    if (keyword.trim()) params.set('search', keyword.trim());
    navigate(`/properties?${params}`);
  };

  return (
    <form className="hero-search" onSubmit={handleSubmit} role="search">
      <div className="hero-search__tabs" role="tablist" aria-label="Listing type">
        {LISTING_TYPES.map((lt) => (
          <button
            key={lt.value}
            type="button"
            role="tab"
            aria-selected={listingType === lt.value}
            className={`hero-search__tab ${listingType === lt.value ? 'is-active' : ''}`}
            onClick={() => changeListingType(lt.value)}
          >
            {lt.label}
          </button>
        ))}
      </div>

      <div className="hero-search__fields">
        <label className="field">
          <span className="field__label">Location</span>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All Locations</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Property Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All Types</option>
            {categories.map((cat) => (
              <optgroup key={cat.value} label={cat.label}>
                <option value={cat.value}>All {cat.label}</option>
                {cat.property_types.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">{listingType === 'buy' ? 'Max Budget' : 'Max Rent / Month'}</span>
          <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="">Any Budget</option>
            {budgetsFor(listingType).map((b) => (
              <option key={b.value} value={b.value}>Up to {b.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Locality / Keyword</span>
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. Indirapuram, Sector 137"
            enterKeyHint="search"
          />
        </label>

        <button type="submit" className="btn btn--gold hero-search__submit">
          <Search size={18} /> Search
        </button>
      </div>
    </form>
  );
}
