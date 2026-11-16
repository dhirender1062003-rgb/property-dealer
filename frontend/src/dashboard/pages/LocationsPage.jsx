import { useState } from 'react';
import { Info, Pencil, Plus, Trash2 } from 'lucide-react';
import adminApi, { errorMessage, fieldErrors } from '../adminApi';
import { useAuth } from '../auth';
import { can } from '../permissions';
import { useUI, Modal } from '../ui';
import { useApiGet } from '../hooks';
import { DataTable, Field, PageHeader, Panel, SearchBox, StatusBadge } from '../components';
import { ErrorState, Loader } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

function CityModal({ city, onClose, onSaved }) {
  const { toast } = useUI();
  const [form, setForm] = useState({
    name: city?.name ?? '', state: city?.state ?? 'Uttar Pradesh', description: city?.description ?? '',
    display_order: city?.display_order ?? 0, is_active: city?.is_active ?? true,
  });
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const input = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  const save = async () => {
    setSaving(true);
    try {
      let body = form;
      if (image) {
        body = new FormData();
        Object.entries(form).forEach(([k, v]) => body.append(k, v));
        body.append('image', image);
      }
      const { data } = city ? await adminApi.patch(`/cities/${city.slug}/`, body) : await adminApi.post('/cities/', body);
      toast.success(city ? 'City updated.' : 'City added.');
      onSaved(data);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={city ? `Edit ${city.name}` : 'Add City'} onClose={onClose}
           footer={(
             <>
               <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
               <button type="button" className="btn btn--gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
             </>
           )}>
      <div className="dash-form-grid">
        <Field label="City name" required error={errors.name}><input type="text" {...input('name')} /></Field>
        <Field label="State" error={errors.state}><input type="text" {...input('state')} /></Field>
        <Field label="Short description" error={errors.description} className="span-2"
               hint="Shown on the About page, e.g. the main areas covered.">
          <input type="text" {...input('description')} maxLength={255} />
        </Field>
        <Field label="Display order" error={errors.display_order}><input type="number" min="0" {...input('display_order')} /></Field>
        <Field label="Photo (optional)" error={errors.image} hint={city?.image ? 'Current photo is kept unless you choose a new one.' : 'Used on the homepage "Areas We Serve" card.'}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files[0] || null)} />
        </Field>
        <label className="dash-check span-2">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
          <span>Show this city on the website</span>
        </label>
      </div>
    </Modal>
  );
}

function LocalityModal({ locality, citySlug, onClose, onSaved }) {
  const { toast } = useUI();
  const [form, setForm] = useState({ name: locality?.name ?? '', display_order: locality?.display_order ?? 0, is_active: locality?.is_active ?? true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (locality) await adminApi.patch(`/localities/${locality.id}/`, form);
      else await adminApi.post('/localities/', { ...form, city: citySlug });
      toast.success(locality ? 'Locality updated.' : 'Locality added.');
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={locality ? `Edit ${locality.name}` : 'Add Locality / Sector'} onClose={onClose} size="sm"
           footer={(
             <>
               <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
               <button type="button" className="btn btn--gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
             </>
           )}>
      <Field label="Name" required error={errors.name || errors.non_field_errors}>
        <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Sector 168" autoFocus />
      </Field>
      <Field label="Display order" error={errors.display_order}>
        <input type="number" min="0" value={form.display_order} onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))} />
      </Field>
      <label className="dash-check">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
        <span>Show on the website</span>
      </label>
    </Modal>
  );
}

export default function LocationsPage() {
  useDocumentTitle('Locations');
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const manage = can(user, 'location.manage');
  const { data: cities, loading, error, reload } = useApiGet('/cities/');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [cityModal, setCityModal] = useState(null); // null | 'new' | city
  const [localityModal, setLocalityModal] = useState(null); // null | 'new' | locality

  if (loading) return <Loader label="Loading locations…" />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={reload} />;

  const city = cities.find((c) => c.slug === selected) ?? cities[0];
  const localities = (city?.localities ?? []).filter((l) => l.name.toLowerCase().includes(search.trim().toLowerCase()));

  const toggleLocality = async (loc) => {
    try {
      await adminApi.patch(`/localities/${loc.id}/`, { is_active: !loc.is_active });
      toast.success(`${loc.name} is now ${loc.is_active ? 'hidden' : 'visible'}.`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const removeLocality = async (loc) => {
    if (!(await confirm({ title: `Delete ${loc.name}?`, danger: true, confirmLabel: 'Delete',
      message: 'Properties in this locality keep their city but lose the locality. Hiding it is usually better.' }))) return;
    try {
      await adminApi.delete(`/localities/${loc.id}/`);
      toast.success('Locality deleted.');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const removeCity = async () => {
    if (!(await confirm({ title: `Delete ${city.name}?`, danger: true, confirmLabel: 'Delete',
      message: 'The city and all its localities will be deleted. Cities with properties cannot be deleted.' }))) return;
    try {
      await adminApi.delete(`/cities/${city.slug}/`);
      toast.success('City deleted.');
      setSelected(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Locations" subtitle="Cities, localities and sectors used in search and property forms."
                  actions={manage && <button type="button" className="btn btn--gold" onClick={() => setCityModal('new')}><Plus size={18} /> Add City</button>} />
      {!manage && <p className="dash-note"><Info size={16} /> You can view locations. Admins and dealers can add or change them.</p>}

      <div className="dash-tabs" role="tablist" aria-label="Cities">
        {cities.map((c) => (
          <button key={c.slug} type="button" role="tab" aria-selected={city?.slug === c.slug}
                  className={`dash-tab ${city?.slug === c.slug ? 'is-active' : ''}`} onClick={() => { setSelected(c.slug); setSearch(''); }}>
            {c.name} <span className="dash-count">{c.localities.length}</span>
          </button>
        ))}
      </div>

      {city && (
        <Panel
          title={<>{city.name} {!city.is_active && <StatusBadge value="draft" label="Hidden" />}</>}
          actions={manage && (
            <span className="dash-actions">
              <button type="button" className="btn btn--outline btn--sm" onClick={() => setCityModal(city)}><Pencil size={15} /> Edit city</button>
              <button type="button" className="btn btn--danger-outline btn--sm" onClick={removeCity}><Trash2 size={15} /> Delete</button>
            </span>
          )}
        >
          <p className="dash-sub">{city.state} · {city.property_count} available properties · {city.description}</p>
          <div className="dash-toolbar">
            <SearchBox value={search} onChange={setSearch} placeholder={`Search ${city.localities.length} localities…`} />
            {manage && <button type="button" className="btn btn--navy" onClick={() => setLocalityModal('new')}><Plus size={18} /> Add Locality</button>}
          </div>
          <DataTable
            rows={localities}
            empty="No localities match."
            columns={[
              { key: 'name', label: 'Locality / Sector', className: 'dash-col-main', render: (l) => <strong>{l.name}</strong> },
              { key: 'display_order', label: 'Order' },
              { key: 'is_active', label: 'On website', render: (l) => (manage ? (
                <label className="dash-switch">
                  <input type="checkbox" checked={l.is_active} onChange={() => toggleLocality(l)} aria-label={`Show ${l.name} on website`} />
                  <span>{l.is_active ? 'Visible' : 'Hidden'}</span>
                </label>
              ) : <StatusBadge value={l.is_active ? 'available' : 'draft'} label={l.is_active ? 'Visible' : 'Hidden'} />) },
              ...(manage ? [{ key: 'actions', label: 'Actions', className: 'dash-col-actions', render: (l) => (
                <span className="dash-actions">
                  <button type="button" className="icon-btn" onClick={() => setLocalityModal(l)} aria-label={`Edit ${l.name}`}><Pencil size={16} /></button>
                  <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeLocality(l)} aria-label={`Delete ${l.name}`}><Trash2 size={16} /></button>
                </span>
              ) }] : []),
            ]}
          />
        </Panel>
      )}

      {cityModal && (
        <CityModal city={cityModal === 'new' ? null : cityModal} onClose={() => setCityModal(null)}
                   onSaved={(saved) => { setCityModal(null); setSelected(saved.slug); reload(); }} />
      )}
      {localityModal && (
        <LocalityModal locality={localityModal === 'new' ? null : localityModal} citySlug={city.slug}
                       onClose={() => setLocalityModal(null)} onSaved={() => { setLocalityModal(null); reload(); }} />
      )}
    </>
  );
}
