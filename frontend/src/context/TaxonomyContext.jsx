import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { FALLBACK_CATEGORIES, FALLBACK_CITIES } from '../constants/options';

// Cities, localities and property types managed in Django admin.
// Loaded once from /api/cities/ and /api/categories/; the built-in fallback
// lists are used only if the API cannot be reached.

function buildTaxonomy(cities, categories, fromApi) {
  const propertyTypes = categories.flatMap((cat) =>
    cat.property_types.map((t) => ({ ...t, category: cat.value })),
  );
  const cityMap = Object.fromEntries(cities.map((c) => [c.slug, c]));
  return {
    cities,
    categories,
    propertyTypes,
    cityMap,
    categoryMap: Object.fromEntries(categories.map((c) => [c.value, c])),
    typeMap: Object.fromEntries(propertyTypes.map((t) => [t.value, t])),
    localitiesFor: (citySlug) => cityMap[citySlug]?.localities ?? [],
    fromApi,
  };
}

const TaxonomyContext = createContext(buildTaxonomy(FALLBACK_CITIES, FALLBACK_CATEGORIES, false));

export function TaxonomyProvider({ children }) {
  const [data, setData] = useState({ cities: FALLBACK_CITIES, categories: FALLBACK_CATEGORIES, fromApi: false });

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/cities/'), api.get('/categories/')])
      .then(([cities, categories]) => {
        if (active && Array.isArray(cities.data) && Array.isArray(categories.data)) {
          setData({ cities: cities.data, categories: categories.data, fromApi: true });
        }
      })
      .catch(() => {
        // API unavailable: keep the fallback lists.
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => buildTaxonomy(data.cities, data.categories, data.fromApi), [data]);
  return <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTaxonomy = () => useContext(TaxonomyContext);
