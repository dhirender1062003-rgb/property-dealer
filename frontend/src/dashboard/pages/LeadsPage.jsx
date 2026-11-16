import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import adminApi, { errorMessage, fieldErrors } from '../adminApi';
import { useUI, Modal } from '../ui';
import { useApiGet, useDebounced, useTeam } from '../hooks';
import { AsyncSelect, DataTable, Field, PageHeader, Panel, SearchBox, SelectInput, StatusBadge } from '../components';
import { formatDate, formatDateTime, todayISO } from '../format';
import { FINISHED_LEAD_STATUSES, LEAD_STATUSES } from '../constants';
import { loadProperties } from '../loaders';
import { INQUIRY_TYPES } from '../../constants/options';
import Pagination from '../../components/Pagination';
import { ErrorState, Loader } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const PAGE_SIZE = 20;

export function FollowUp({ lead }) {
  if (!lead.follow_up_date) return <span className="dash-muted">Not set</span>;
  const overdue = lead.follow_up_date < todayISO() && !FINISHED_LEAD_STATUSES.includes(lead.inquiry_status);
  const today = lead.follow_up_date === todayISO();
  return (
    <span className={overdue ? 'dash-overdue' : today ? 'dash-today' : ''}>
      {formatDate(lead.follow_up_date)}{overdue ? ' · overdue' : today ? ' · today' : ''}
    </span>
  );
}

function NewLeadModal({ onClose, onSaved }) {
  const { toast } = useUI();
  const team = useTeam();
  const [form, setForm] = useState({
    customer_name: '', phone: '', email: '', inquiry_type: 'buy', budget: '', message: '',
    inquiry_status: 'new', follow_up_date: '', assigned_to: '', admin_notes: '',
  });
  const [property, setProperty] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const input = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await adminApi.post('/inquiries/', {
        ...form,
        property: property?.value ?? null,
        follow_up_date: form.follow_up_date || null,
        assigned_to: form.assigned_to || null,
      });
      toast.success('Lead added.');
      onSaved(data);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, 'Could not add the lead.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Lead" onClose={onClose} size="lg"
           footer={(
             <>
               <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
               <button type="button" className="btn btn--gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add Lead'}</button>
             </>
           )}>
      <p className="dash-note">For enquiries received by phone, WhatsApp or walk-in. A customer record is created automatically.</p>
      <div className="dash-form-grid">
        <Field label="Customer name" required error={errors.customer_name}><input type="text" {...input('customer_name')} /></Field>
        <Field label="Mobile number" required error={errors.phone}><input type="tel" inputMode="tel" {...input('phone')} /></Field>
        <Field label="Email" error={errors.email}><input type="email" {...input('email')} /></Field>
        <Field label="Interested in" error={errors.inquiry_type}>
          <SelectInput value={form.inquiry_type} onChange={(v) => setForm((f) => ({ ...f, inquiry_type: v }))} options={INQUIRY_TYPES} />
        </Field>
        <Field label="Interested property" error={errors.property} className="span-2">
          <AsyncSelect value={property} onChange={setProperty} load={loadProperties} placeholder="Optional: search property" />
        </Field>
        <Field label="Budget" error={errors.budget}><input type="text" {...input('budget')} placeholder="e.g. ₹50 Lac - ₹1 Cr" /></Field>
        <Field label="Lead status" error={errors.inquiry_status}>
          <SelectInput value={form.inquiry_status} onChange={(v) => setForm((f) => ({ ...f, inquiry_status: v }))} options={LEAD_STATUSES} />
        </Field>
        <Field label="Follow-up date" error={errors.follow_up_date}><input type="date" {...input('follow_up_date')} /></Field>
        <Field label="Assigned to" error={errors.assigned_to}>
          <SelectInput value={form.assigned_to} onChange={(v) => setForm((f) => ({ ...f, assigned_to: v }))} placeholder="Unassigned"
                       options={team.map((u) => ({ value: u.id, label: u.first_name || u.username }))} />
        </Field>
        <Field label="Customer's requirement" required error={errors.message} className="span-2">
          <textarea rows={3} {...input('message')} />
        </Field>
        <Field label="Internal notes" error={errors.admin_notes} className="span-2">
          <textarea rows={2} {...input('admin_notes')} />
        </Field>
      </div>
    </Modal>
  );
}

export default function LeadsPage() {
  useDocumentTitle('Leads');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const debouncedSearch = useDebounced(search);
  const page = Number(params.get('page')) || 1;
  const showNew = params.get('new') === '1';

  const query = { page, page_size: PAGE_SIZE, search: debouncedSearch };
  ['inquiry_status', 'follow_up', 'inquiry_type'].forEach((k) => { if (params.get(k)) query[k] = params.get(k); });
  const { data, loading, error, reload } = useApiGet('/inquiries/', query);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Leads" subtitle={data ? `${data.count} enquiries` : 'Website and manual enquiries'}
                  actions={<button type="button" className="btn btn--gold" onClick={() => setFilter('new', '1')}><Plus size={18} /> Add Lead</button>} />

      <div className="dash-tabs" role="tablist" aria-label="Lead status">
        {[{ value: '', label: 'All' }, ...LEAD_STATUSES.slice(0, 5)].map((s) => (
          <button key={s.value} type="button" role="tab" aria-selected={(params.get('inquiry_status') || '') === s.value}
                  className={`dash-tab ${(params.get('inquiry_status') || '') === s.value ? 'is-active' : ''}`}
                  onClick={() => setFilter('inquiry_status', s.value)}>
            {s.label}
          </button>
        ))}
      </div>

      <Panel>
        <div className="dash-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, phone, email, property…" />
          <SelectInput value={params.get('inquiry_status')} onChange={(v) => setFilter('inquiry_status', v)} placeholder="All statuses"
                       options={LEAD_STATUSES} aria-label="Lead status" />
          <SelectInput value={params.get('follow_up')} onChange={(v) => setFilter('follow_up', v)} placeholder="Any follow-up"
                       options={[{ value: 'overdue', label: 'Follow-up overdue' }, { value: 'today', label: 'Follow-up today' },
                         { value: 'upcoming', label: 'Follow-up upcoming' }, { value: 'none', label: 'No follow-up set' }]} aria-label="Follow-up" />
          <SelectInput value={params.get('inquiry_type')} onChange={(v) => setFilter('inquiry_type', v)} placeholder="Any interest"
                       options={INQUIRY_TYPES} aria-label="Interest" />
        </div>
        {loading && <Loader label="Loading leads…" />}
        {error && <ErrorState message={errorMessage(error)} onRetry={reload} />}
        {!loading && !error && (
          <DataTable
            rows={data.results}
            empty="No leads match these filters."
            onRowClick={(row) => navigate(`/dashboard/leads/${row.id}`)}
            columns={[
              { key: 'customer_name', label: 'Customer', className: 'dash-col-main',
                render: (r) => <><strong>{r.customer_name}</strong><small className="dash-sub">{r.phone}{r.email ? ` · ${r.email}` : ''}</small></> },
              { key: 'property_title', label: 'Property', render: (r) => r.property_title || <span className="dash-muted">General enquiry</span> },
              { key: 'inquiry_type', label: 'Interest', render: (r) => r.inquiry_type_display },
              { key: 'budget', label: 'Budget', render: (r) => r.budget || '—' },
              { key: 'inquiry_status', label: 'Status', render: (r) => <StatusBadge value={r.inquiry_status} label={r.inquiry_status_display} /> },
              { key: 'follow_up_date', label: 'Follow-up', render: (r) => <FollowUp lead={r} /> },
              { key: 'created_at', label: 'Received', render: (r) => formatDateTime(r.created_at) },
            ]}
          />
        )}
        <Pagination page={page} totalPages={data ? Math.ceil(data.count / PAGE_SIZE) : 0} onChange={(p) => setFilter('page', p > 1 ? String(p) : '')} />
      </Panel>

      {showNew && (
        <NewLeadModal onClose={() => setFilter('new', '')} onSaved={(lead) => navigate(`/dashboard/leads/${lead.id}`)} />
      )}
    </>
  );
}
