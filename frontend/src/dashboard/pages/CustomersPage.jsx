import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import adminApi, { errorMessage, fieldErrors } from '../adminApi';
import { useUI, Modal } from '../ui';
import { useApiGet, useDebounced } from '../hooks';
import { DataTable, Field, PageHeader, Panel, SearchBox } from '../components';
import { formatDateTime } from '../format';
import Pagination from '../../components/Pagination';
import { ErrorState, Loader } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const PAGE_SIZE = 20;

export function CustomerFields({ form, setForm, errors }) {
  const input = (key) => ({ value: form[key] ?? '', onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });
  return (
    <div className="dash-form-grid">
      <Field label="Name" required error={errors.name}><input type="text" {...input('name')} /></Field>
      <Field label="Mobile number" required error={errors.phone}><input type="tel" inputMode="tel" {...input('phone')} /></Field>
      <Field label="Email" error={errors.email} className="span-2"><input type="email" {...input('email')} /></Field>
      <Field label="Private notes" error={errors.notes} className="span-2"><textarea rows={3} {...input('notes')} /></Field>
    </div>
  );
}

function NewCustomerModal({ onClose, onSaved }) {
  const { toast } = useUI();
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await adminApi.post('/customers/', form);
      toast.success('Customer added.');
      onSaved(data);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, 'Could not add the customer.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Customer" onClose={onClose}
           footer={(
             <>
               <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
               <button type="button" className="btn btn--gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add Customer'}</button>
             </>
           )}>
      <CustomerFields form={form} setForm={setForm} errors={errors} />
    </Modal>
  );
}

export default function CustomersPage() {
  useDocumentTitle('Customers');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const debouncedSearch = useDebounced(search);
  const page = Number(params.get('page')) || 1;
  const { data, loading, error, reload } = useApiGet('/customers/', { page, page_size: PAGE_SIZE, search: debouncedSearch });

  return (
    <>
      <PageHeader title="Customers" subtitle={data ? `${data.count} customers` : 'Everyone who has enquired or visited'}
                  actions={<button type="button" className="btn btn--gold" onClick={() => setAdding(true)}><Plus size={18} /> Add Customer</button>} />
      <Panel>
        <div className="dash-toolbar">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setParams({}); }} placeholder="Search name, phone or email…" />
        </div>
        {loading && <Loader label="Loading customers…" />}
        {error && <ErrorState message={errorMessage(error)} onRetry={reload} />}
        {!loading && !error && (
          <DataTable
            rows={data.results}
            empty="No customers yet. They are created automatically from enquiries."
            onRowClick={(row) => navigate(`/dashboard/customers/${row.id}`)}
            columns={[
              { key: 'name', label: 'Customer', className: 'dash-col-main', render: (c) => <strong>{c.name}</strong> },
              { key: 'phone', label: 'Phone' },
              { key: 'email', label: 'Email', render: (c) => c.email || '—' },
              { key: 'inquiry_count', label: 'Enquiries' },
              { key: 'visit_count', label: 'Visits' },
              { key: 'last_inquiry_at', label: 'Last enquiry', render: (c) => formatDateTime(c.last_inquiry_at) },
            ]}
          />
        )}
        <Pagination page={page} totalPages={data ? Math.ceil(data.count / PAGE_SIZE) : 0}
                    onChange={(p) => setParams(p > 1 ? { page: String(p) } : {})} />
      </Panel>
      {adding && <NewCustomerModal onClose={() => setAdding(false)} onSaved={(c) => navigate(`/dashboard/customers/${c.id}`)} />}
    </>
  );
}
