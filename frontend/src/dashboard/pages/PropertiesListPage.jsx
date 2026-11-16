import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import adminApi, { errorMessage } from '../adminApi';
import { useAuth } from '../auth';
import { can } from '../permissions';
import { useUI } from '../ui';
import { useApiGet, useDebounced } from '../hooks';
import { DataTable, PageHeader, Panel, SearchBox, SelectInput } from '../components';
import { PROPERTY_STATUSES } from '../constants';
import { LISTING_TYPES } from '../../constants/options';
import { useTaxonomy } from '../../context/TaxonomyContext';
import Pagination from '../../components/Pagination';
import PropertyImage from '../../components/PropertyImage';
import { ErrorState, Loader } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatPropertyPrice, propertyLocation } from '../../utils/format';

const PAGE_SIZE = 20;
const FILTERS = ['status', 'listing_type', 'category', 'property_type', 'city', 'featured'];

export default function PropertiesListPage() {
  useDocumentTitle('Properties');
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const { categories, propertyTypes, cities } = useTaxonomy();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const debouncedSearch = useDebounced(search);
  const page = Number(params.get('page')) || 1;

  const query = { page, page_size: PAGE_SIZE, search: debouncedSearch, ordering: params.get('ordering') || '-created_at' };
  FILTERS.forEach((key) => { if (params.get(key)) query[key] = params.get(key); });
  const { data, loading, error, reload, setData } = useApiGet('/properties/', query);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key === 'category') next.delete('property_type');
    next.delete('page');
    setParams(next);
  };

  const updateRow = async (row, changes, message) => {
    try {
      const { data: updated } = await adminApi.patch(`/properties/${row.id}/`, changes);
      setData((d) => ({ ...d, results: d.results.map((r) => (r.id === row.id ? { ...r, ...changes, status: updated.status, featured: updated.featured } : r)) }));
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (row) => {
    const ok = await confirm({
      title: 'Delete property?', danger: true, confirmLabel: 'Delete',
      message: `"${row.title}" and all its photos will be permanently deleted. To keep the record, mark it Sold or Draft instead.`,
    });
    if (!ok) return;
    try {
      await adminApi.delete(`/properties/${row.id}/`);
      toast.success('Property deleted.');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const types = propertyTypes.filter((t) => !params.get('category') || t.category === params.get('category'));
  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

  return (
    <>
      <PageHeader
        title="Properties"
        subtitle={data ? `${data.count} properties` : 'All listings, including sold and draft'}
        actions={<Link to="/dashboard/properties/new" className="btn btn--gold"><Plus size={18} /> Add Property</Link>}
      />

      <Panel>
        <div className="dash-toolbar">
          <SearchBox value={search} onChange={(v) => { setSearch(v); if (params.get('page')) setFilter('page', ''); }}
                     placeholder="Search title, locality, address…" />
          <SelectInput value={params.get('status')} onChange={(v) => setFilter('status', v)} placeholder="All statuses"
                       options={PROPERTY_STATUSES} aria-label="Status" />
          <SelectInput value={params.get('listing_type')} onChange={(v) => setFilter('listing_type', v)} placeholder="Buy / Rent / Lease"
                       options={LISTING_TYPES} aria-label="Listing type" />
          <SelectInput value={params.get('category')} onChange={(v) => setFilter('category', v)} placeholder="All categories"
                       options={categories} aria-label="Category" />
          <SelectInput value={params.get('property_type')} onChange={(v) => setFilter('property_type', v)} placeholder="All types"
                       options={types} aria-label="Property type" />
          <SelectInput value={params.get('city')} onChange={(v) => setFilter('city', v)} placeholder="All cities"
                       options={cities.map((c) => ({ value: c.slug, label: c.name }))} aria-label="City" />
          <SelectInput value={params.get('featured')} onChange={(v) => setFilter('featured', v)} placeholder="Featured: any"
                       options={[{ value: 'true', label: 'Featured only' }, { value: 'false', label: 'Not featured' }]} aria-label="Featured" />
        </div>

        {loading && <Loader label="Loading properties…" />}
        {error && <ErrorState message={errorMessage(error)} onRetry={reload} />}
        {!loading && !error && (
          <DataTable
            rows={data.results}
            empty="No properties match these filters."
            onRowClick={(row) => navigate(`/dashboard/properties/${row.id}/edit`)}
            columns={[
              {
                key: 'title', label: 'Property', className: 'dash-col-main',
                render: (r) => (
                  <span className="dash-prop">
                    <PropertyImage src={r.primary_image} alt="" className="dash-prop__img" />
                    <span>
                      <strong>{r.title}</strong>
                      <small className="dash-sub">{propertyLocation(r)} · {r.property_type_display}</small>
                    </span>
                  </span>
                ),
              },
              { key: 'listing_type', label: 'For', render: (r) => LISTING_TYPES.find((l) => l.value === r.listing_type)?.label },
              { key: 'price', label: 'Price', render: (r) => formatPropertyPrice(r) },
              {
                key: 'status', label: 'Status',
                render: (r) => (
                  <SelectInput value={r.status} options={PROPERTY_STATUSES} aria-label={`Status of ${r.title}`}
                               className={`dash-status-select dash-status-select--${r.status}`}
                               onChange={(v) => updateRow(r, { status: v }, `Marked as ${v}.`)} />
                ),
              },
              {
                key: 'featured', label: 'Featured',
                render: (r) => (
                  <button type="button" className={`dash-star ${r.featured ? 'is-on' : ''}`} aria-pressed={r.featured}
                          aria-label={r.featured ? 'Remove from featured' : 'Mark as featured'}
                          onClick={() => updateRow(r, { featured: !r.featured }, r.featured ? 'Removed from homepage.' : 'Now featured on homepage.')}>
                    <Star size={18} />
                  </button>
                ),
              },
              {
                key: 'actions', label: 'Actions', className: 'dash-col-actions',
                render: (r) => (
                  <span className="dash-actions">
                    <Link to={`/dashboard/properties/${r.id}/edit`} className="icon-btn" aria-label={`Edit ${r.title}`} title="Edit"><Pencil size={16} /></Link>
                    {r.status === 'available' && (
                      <a href={`/properties/${r.slug}`} target="_blank" rel="noreferrer" className="icon-btn" aria-label="View on website" title="View on website"><ExternalLink size={16} /></a>
                    )}
                    {can(user, 'property.delete') && (
                      <button type="button" className="icon-btn icon-btn--danger" onClick={() => remove(r)} aria-label={`Delete ${r.title}`} title="Delete"><Trash2 size={16} /></button>
                    )}
                  </span>
                ),
              },
            ]}
          />
        )}
        <Pagination page={page} totalPages={totalPages} onChange={(p) => setFilter('page', p > 1 ? String(p) : '')} />
      </Panel>
    </>
  );
}
