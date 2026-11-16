import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import adminApi, { errorMessage } from '../adminApi';
import { useAuth } from '../auth';
import { can } from '../permissions';
import { useUI } from '../ui';
import { useApiGet, useDebounced } from '../hooks';
import { DataTable, PageHeader, Panel, SearchBox, SelectInput } from '../components';
import { formatDateTime } from '../format';
import { VISIT_STATUSES } from '../constants';
import VisitFormModal from '../VisitFormModal';
import Pagination from '../../components/Pagination';
import { ErrorState, Loader } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const PAGE_SIZE = 20;
const WHEN = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

export default function SiteVisitsPage() {
  useDocumentTitle('Site Visits');
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | visit
  const debouncedSearch = useDebounced(search);
  const when = params.get('when') || 'upcoming';
  const page = Number(params.get('page')) || 1;

  const query = { page, page_size: PAGE_SIZE, search: debouncedSearch, ordering: when === 'past' ? '-scheduled_at' : 'scheduled_at' };
  if (when !== 'all') query.when = when;
  if (params.get('status')) query.status = params.get('status');
  const { data, loading, error, reload, setData } = useApiGet('/site-visits/', query);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const changeStatus = async (visit, status) => {
    try {
      const { data: updated } = await adminApi.patch(`/site-visits/${visit.id}/`, { status });
      setData((d) => ({ ...d, results: d.results.map((v) => (v.id === visit.id ? updated : v)) }));
      toast.success(`Visit marked ${updated.status_display.toLowerCase()}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (visit) => {
    if (!(await confirm({ title: 'Delete site visit?', message: 'This visit record will be permanently deleted.', danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await adminApi.delete(`/site-visits/${visit.id}/`);
      toast.success('Visit deleted.');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Site Visits" subtitle={data ? `${data.count} visits` : 'Property viewings with customers'}
                  actions={<button type="button" className="btn btn--gold" onClick={() => setEditing('new')}><CalendarPlus size={18} /> Schedule Visit</button>} />

      <div className="dash-tabs" role="tablist" aria-label="When">
        {WHEN.map((w) => (
          <button key={w.value} type="button" role="tab" aria-selected={when === w.value}
                  className={`dash-tab ${when === w.value ? 'is-active' : ''}`}
                  onClick={() => setFilter('when', w.value === 'upcoming' ? '' : w.value)}>
            {w.label}
          </button>
        ))}
      </div>

      <Panel>
        <div className="dash-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Search customer, phone or property…" />
          <SelectInput value={params.get('status')} onChange={(v) => setFilter('status', v)} placeholder="All statuses"
                       options={VISIT_STATUSES} aria-label="Visit status" />
        </div>
        {loading && <Loader label="Loading visits…" />}
        {error && <ErrorState message={errorMessage(error)} onRetry={reload} />}
        {!loading && !error && (
          <DataTable
            rows={data.results}
            empty="No site visits here. Schedule one with the button above."
            columns={[
              { key: 'scheduled_at', label: 'Date & time', render: (v) => <strong>{formatDateTime(v.scheduled_at)}</strong> },
              { key: 'customer_name', label: 'Customer', className: 'dash-col-main',
                render: (v) => <><Link to={`/dashboard/customers/${v.customer}`}>{v.customer_name}</Link><small className="dash-sub">{v.customer_phone}</small></> },
              { key: 'property_title', label: 'Property',
                render: (v) => (v.property ? <><Link to={`/dashboard/properties/${v.property}/edit`}>{v.property_title}</Link><small className="dash-sub">{v.property_location}</small></> : '—') },
              { key: 'status', label: 'Status',
                render: (v) => (
                  <SelectInput value={v.status} options={VISIT_STATUSES} onChange={(s) => changeStatus(v, s)}
                               className={`dash-status-select dash-status-select--${v.status}`} aria-label="Visit status" />
                ) },
              { key: 'assigned_to_name', label: 'Assigned', render: (v) => v.assigned_to_name || '—' },
              { key: 'actions', label: 'Actions', className: 'dash-col-actions',
                render: (v) => (
                  <span className="dash-actions">
                    <button type="button" className="icon-btn" onClick={() => setEditing(v)} aria-label="Edit visit" title="Edit"><Pencil size={16} /></button>
                    {can(user, 'visit.delete') && (
                      <button type="button" className="icon-btn icon-btn--danger" onClick={() => remove(v)} aria-label="Delete visit" title="Delete"><Trash2 size={16} /></button>
                    )}
                  </span>
                ) },
            ]}
          />
        )}
        <Pagination page={page} totalPages={data ? Math.ceil(data.count / PAGE_SIZE) : 0} onChange={(p) => setFilter('page', p > 1 ? String(p) : '')} />
      </Panel>

      {editing && (
        <VisitFormModal
          visit={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </>
  );
}
