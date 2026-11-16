import { Link } from 'react-router-dom';
import { Building2, House, Plus } from 'lucide-react';
import { PageHeader, Panel } from '../components';
import { useApiGet } from '../hooks';
import { errorMessage } from '../adminApi';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { ErrorState, Loader } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function CategoriesPage() {
  useDocumentTitle('Property Categories');
  const { categories } = useTaxonomy();
  const { data, loading, error, reload } = useApiGet('/dashboard/stats/');

  if (loading) return <Loader label="Loading categories…" />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={reload} />;
  const { by_category: byCategory, by_type: byType } = data.properties;

  return (
    <>
      <PageHeader title="Property Categories"
                  subtitle="Residential and commercial property types, with the number of listings in each (all statuses)." />
      <div className="dash-grid-2">
        {categories.map((cat) => {
          const Icon = cat.value === 'commercial' ? Building2 : House;
          return (
            <Panel key={cat.value}
                   title={<><Icon size={20} /> {cat.label} <span className="dash-count">{byCategory[cat.value] ?? 0}</span></>}
                   actions={<Link to={`/dashboard/properties?category=${cat.value}`} className="link-btn">View all</Link>}>
              <ul className="dash-type-list">
                {cat.property_types.map((t) => (
                  <li key={t.value}>
                    <Link to={`/dashboard/properties?category=${cat.value}&property_type=${t.value}`}>
                      <span>{t.label}</span>
                      <strong>{byType[t.value] ?? 0}</strong>
                    </Link>
                    <Link to={`/dashboard/properties/new?type=${t.value}`} className="icon-btn" aria-label={`Add ${t.label}`} title={`Add ${t.label}`}>
                      <Plus size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
