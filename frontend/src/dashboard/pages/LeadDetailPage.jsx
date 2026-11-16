import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarPlus, Mail, MessageCircle, Phone, Save, Trash2 } from 'lucide-react';
import adminApi, { errorMessage, fieldErrors } from '../adminApi';
import { useAuth } from '../auth';
import { can } from '../permissions';
import { useUI } from '../ui';
import { useApiGet, useResource, useTeam } from '../hooks';
import { DataTable, Field, PageHeader, Panel, SelectInput, StatusBadge } from '../components';
import { formatDateTime } from '../format';
import { LEAD_STATUSES } from '../constants';
import VisitFormModal from '../VisitFormModal';
import { FollowUp } from './LeadsPage';
import { ErrorState, Loader } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { telLink, whatsappLink } from '../../utils/format';

export default function LeadDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const team = useTeam();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const lead = useResource(async () => {
    const { data } = await adminApi.get(`/inquiries/${id}/`);
    setForm({ inquiry_status: data.inquiry_status, follow_up_date: data.follow_up_date || '',
      assigned_to: data.assigned_to || '', admin_notes: data.admin_notes });
    return data;
  }, id);
  const visits = useApiGet('/site-visits/', { inquiry: id, ordering: '-scheduled_at' });
  useDocumentTitle(lead.data ? `Lead: ${lead.data.customer_name}` : 'Lead');

  if (lead.loading) return <Loader label="Loading lead…" />;
  if (lead.error) return <ErrorState message={errorMessage(lead.error)} onRetry={lead.reload} />;
  const l = lead.data;

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await adminApi.patch(`/inquiries/${id}/`, {
        ...form, follow_up_date: form.follow_up_date || null, assigned_to: form.assigned_to || null,
      });
      lead.setData(data);
      setErrors({});
      toast.success('Lead updated.');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Delete lead?', message: 'This enquiry will be permanently deleted.', danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await adminApi.delete(`/inquiries/${id}/`);
      toast.success('Lead deleted.');
      navigate('/dashboard/leads');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <PageHeader
        back={{ to: '/dashboard/leads', label: 'All leads' }}
        title={l.customer_name}
        subtitle={`Received ${formatDateTime(l.created_at)} · ${l.source_page === 'dashboard' ? 'Added by staff' : 'Website enquiry'}`}
        actions={(
          <>
            <button type="button" className="btn btn--gold" onClick={() => setScheduling(true)}><CalendarPlus size={18} /> Schedule Visit</button>
            {can(user, 'lead.delete') && (
              <button type="button" className="btn btn--danger-outline" onClick={remove}><Trash2 size={18} /> Delete</button>
            )}
          </>
        )}
      />

      <div className="dash-grid-2">
        <Panel title="Customer">
          <dl className="dash-dl">
            <div><dt>Name</dt><dd>{l.customer ? <Link to={`/dashboard/customers/${l.customer}`}>{l.customer_name}</Link> : l.customer_name}</dd></div>
            <div><dt>Phone</dt><dd>{l.phone}</dd></div>
            <div><dt>Email</dt><dd>{l.email || '—'}</dd></div>
          </dl>
          <div className="dash-contact-actions">
            <a href={telLink(l.phone)} className="btn btn--navy btn--sm"><Phone size={16} /> Call</a>
            <a href={whatsappLink(`91${l.phone}`, `Hi ${l.customer_name}, this is regarding your property enquiry.`)} target="_blank" rel="noreferrer" className="btn btn--whatsapp btn--sm"><MessageCircle size={16} /> WhatsApp</a>
            {l.email && <a href={`mailto:${l.email}`} className="btn btn--outline btn--sm"><Mail size={16} /> Email</a>}
          </div>
        </Panel>

        <Panel title="Enquiry">
          <dl className="dash-dl">
            <div><dt>Property</dt><dd>{l.property ? <Link to={`/dashboard/properties/${l.property}/edit`}>{l.property_title}</Link> : 'General enquiry'}</dd></div>
            <div><dt>Interested in</dt><dd>{l.inquiry_type_display}</dd></div>
            <div><dt>Budget</dt><dd>{l.budget || '—'}</dd></div>
            <div><dt>Preferred city</dt><dd>{l.preferred_city || '—'}</dd></div>
            <div><dt>Message</dt><dd className="dash-message">{l.message}</dd></div>
          </dl>
        </Panel>
      </div>

      <Panel title="Follow-up" actions={<span>Current: <StatusBadge value={l.inquiry_status} label={l.inquiry_status_display} /> · <FollowUp lead={l} /></span>}>
        <div className="dash-form-grid dash-form-grid--3">
          <Field label="Lead status" error={errors.inquiry_status}>
            <SelectInput value={form.inquiry_status} onChange={set('inquiry_status')} options={LEAD_STATUSES} />
          </Field>
          <Field label="Follow-up date" error={errors.follow_up_date}>
            <input type="date" value={form.follow_up_date} onChange={(e) => set('follow_up_date')(e.target.value)} />
          </Field>
          <Field label="Assigned to" error={errors.assigned_to}>
            <SelectInput value={form.assigned_to} onChange={set('assigned_to')} placeholder="Unassigned"
                         options={team.map((u) => ({ value: u.id, label: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username }))} />
          </Field>
          <Field label="Internal notes (never shown to the customer)" error={errors.admin_notes} className="span-3">
            <textarea rows={4} value={form.admin_notes} onChange={(e) => set('admin_notes')(e.target.value)} placeholder="Call summary, requirements, next steps…" />
          </Field>
        </div>
        <button type="button" className="btn btn--gold" onClick={save} disabled={saving}><Save size={18} /> {saving ? 'Saving…' : 'Save Follow-up'}</button>
      </Panel>

      <Panel title="Site visits for this lead">
        {visits.loading ? <Loader label="Loading visits…" /> : (
          <DataTable
            rows={visits.data?.results}
            empty="No visits scheduled yet."
            columns={[
              { key: 'scheduled_at', label: 'When', render: (v) => formatDateTime(v.scheduled_at) },
              { key: 'property_title', label: 'Property', render: (v) => v.property_title || '—' },
              { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v.status} label={v.status_display} /> },
              { key: 'assigned_to_name', label: 'Assigned', render: (v) => v.assigned_to_name || '—' },
            ]}
          />
        )}
      </Panel>

      {scheduling && (
        <VisitFormModal
          preset={{
            inquiry: l.id,
            customer: { value: l.customer, label: l.customer_name, sub: l.phone },
            property: l.property ? { value: l.property, label: l.property_title } : null,
          }}
          onClose={() => setScheduling(false)}
          onSaved={() => { setScheduling(false); visits.reload(); lead.reload(); }}
        />
      )}
    </>
  );
}
