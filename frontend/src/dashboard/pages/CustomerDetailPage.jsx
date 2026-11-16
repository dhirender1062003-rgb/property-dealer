import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarPlus, MessageCircle, Phone, Save, Trash2 } from 'lucide-react';
import adminApi, { errorMessage, fieldErrors } from '../adminApi';
import { useAuth } from '../auth';
import { can } from '../permissions';
import { useUI } from '../ui';
import { useResource } from '../hooks';
import { DataTable, PageHeader, Panel, StatusBadge } from '../components';
import { formatDateTime } from '../format';
import { CustomerFields } from './CustomersPage';
import VisitFormModal from '../VisitFormModal';
import { ErrorState, Loader } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatPrice, telLink, whatsappLink } from '../../utils/format';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const customer = useResource(async () => {
    const { data } = await adminApi.get(`/customers/${id}/`);
    setForm({ name: data.name, phone: data.phone, email: data.email, notes: data.notes });
    return data;
  }, id);
  useDocumentTitle(customer.data ? `Customer: ${customer.data.name}` : 'Customer');

  if (customer.loading) return <Loader label="Loading customer…" />;
  if (customer.error) return <ErrorState message={errorMessage(customer.error)} onRetry={customer.reload} />;
  const c = customer.data;

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.patch(`/customers/${id}/`, form);
      setErrors({});
      toast.success('Customer saved.');
      customer.reload();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({
      title: 'Delete customer?', danger: true, confirmLabel: 'Delete',
      message: 'The customer and their site visits will be deleted. Their enquiries are kept as leads.',
    }))) return;
    try {
      await adminApi.delete(`/customers/${id}/`);
      toast.success('Customer deleted.');
      navigate('/dashboard/customers');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        back={{ to: '/dashboard/customers', label: 'All customers' }}
        title={c.name}
        subtitle={`Customer since ${formatDateTime(c.created_at)} · ${c.inquiry_count} enquiries · ${c.visit_count} visits`}
        actions={(
          <>
            <a href={telLink(c.phone)} className="btn btn--navy"><Phone size={18} /> Call</a>
            <a href={whatsappLink(`91${c.phone}`)} target="_blank" rel="noreferrer" className="btn btn--whatsapp"><MessageCircle size={18} /> WhatsApp</a>
            <button type="button" className="btn btn--gold" onClick={() => setScheduling(true)}><CalendarPlus size={18} /> Schedule Visit</button>
            {can(user, 'customer.delete') && (
              <button type="button" className="btn btn--danger-outline" onClick={remove}><Trash2 size={18} /> Delete</button>
            )}
          </>
        )}
      />

      <div className="dash-grid-2">
        <Panel title="Contact details">
          <CustomerFields form={form} setForm={setForm} errors={errors} />
          <button type="button" className="btn btn--gold" onClick={save} disabled={saving}><Save size={18} /> {saving ? 'Saving…' : 'Save'}</button>
        </Panel>

        <Panel title="Interested properties">
          {c.interested_properties.length === 0 ? <p className="dash-empty">No properties linked yet.</p> : (
            <ul className="dash-type-list">
              {c.interested_properties.map((p) => (
                <li key={p.id}>
                  <Link to={`/dashboard/properties/${p.id}/edit`}>
                    <span>{p.title}<small className="dash-sub">{formatPrice(p.price)}{p.listing_type !== 'buy' ? '/month' : ''}</small></span>
                    <StatusBadge value={p.status} label={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Enquiry history">
        <DataTable
          rows={c.inquiries}
          empty="No enquiries."
          onRowClick={(row) => navigate(`/dashboard/leads/${row.id}`)}
          columns={[
            { key: 'created_at', label: 'Date', render: (i) => formatDateTime(i.created_at) },
            { key: 'property_title', label: 'Property', render: (i) => i.property_title || 'General enquiry' },
            { key: 'inquiry_type', label: 'Interest', render: (i) => i.inquiry_type_display },
            { key: 'budget', label: 'Budget', render: (i) => i.budget || '—' },
            { key: 'message', label: 'Message', render: (i) => <span className="dash-clamp" title={i.message}>{i.message}</span> },
            { key: 'inquiry_status', label: 'Status', render: (i) => <StatusBadge value={i.inquiry_status} label={i.inquiry_status_display} /> },
          ]}
        />
      </Panel>

      <Panel title="Site visits">
        <DataTable
          rows={c.site_visits}
          empty="No site visits."
          columns={[
            { key: 'scheduled_at', label: 'When', render: (v) => formatDateTime(v.scheduled_at) },
            { key: 'property_title', label: 'Property', render: (v) => v.property_title || '—' },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v.status} label={v.status_display} /> },
            { key: 'notes', label: 'Notes', render: (v) => v.notes || '—' },
          ]}
        />
      </Panel>

      {scheduling && (
        <VisitFormModal
          preset={{ customer: { value: c.id, label: c.name, sub: c.phone } }}
          onClose={() => setScheduling(false)}
          onSaved={() => { setScheduling(false); customer.reload(); }}
        />
      )}
    </>
  );
}
