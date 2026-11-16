import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ExternalLink, Save } from 'lucide-react';
import adminApi, { errorMessage, fieldErrors } from '../adminApi';
import { useUI } from '../ui';
import { useApiGet, useResource } from '../hooks';
import { Field, PageHeader, Panel, SelectInput } from '../components';
import PhotoManager from '../PhotoManager';
import {
  AGE_OPTIONS, AREA_UNIT_OPTIONS, FACING_OPTIONS, POSSESSION_OPTIONS, PROPERTY_STATUSES,
} from '../constants';
import { FURNISHING_OPTIONS, LISTING_TYPES } from '../../constants/options';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { ErrorState, Loader } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatPrice } from '../../utils/format';

const EMPTY = {
  title: '', listing_type: 'buy', property_type: '', status: 'available', featured: false,
  price: '', area: '', area_unit: 'sqft', city: '', locality: '', address: '',
  bedrooms: '', bathrooms: '', balconies: '', furnishing_status: '', floor: '', total_floors: '',
  facing: '', parking: '', possession_status: '', property_age: '', description: '', amenities: [],
};
const NUMBER_FIELDS = ['price', 'area', 'bedrooms', 'bathrooms', 'balconies', 'floor', 'total_floors', 'parking'];

function fromProperty(p) {
  const form = { ...EMPTY };
  Object.keys(EMPTY).forEach((key) => {
    if (p[key] !== undefined && p[key] !== null) form[key] = p[key];
  });
  form.city = p.city_id ?? '';
  form.locality = p.locality_id ?? '';
  form.amenities = (p.amenities || []).map((a) => a.id);
  return form;
}

function toPayload(form) {
  const payload = { ...form };
  NUMBER_FIELDS.forEach((key) => { payload[key] = form[key] === '' ? null : Number(form[key]); });
  payload.city = form.city ? Number(form.city) : null;
  payload.locality = form.locality ? Number(form.locality) : null;
  return payload;
}

export default function PropertyFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useUI();
  const { categories, typeMap } = useTaxonomy();
  const cities = useApiGet('/cities/');
  const amenities = useApiGet('/amenities/');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState([]);

  const property = useResource(async () => {
    if (!isEdit) {
      setForm({ ...EMPTY, property_type: searchParams.get('type') || '' });
      return null;
    }
    const { data } = await adminApi.get(`/properties/${id}/`);
    setForm(fromProperty(data));
    return data;
  }, id);
  useDocumentTitle(isEdit ? `Edit: ${property.data?.title ?? 'Property'}` : 'Add Property');

  // (isEdit && !property.data): just switched from "new" to "edit" and the property is still loading.
  if (property.loading || !form || (isEdit && !property.data)) {
    return property.error ? <ErrorState message={errorMessage(property.error)} onRetry={property.reload} /> : <Loader label="Loading…" />;
  }

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value, ...(key === 'city' ? { locality: '' } : {}) }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const input = (key) => ({ value: form[key] ?? '', onChange: (e) => set(key)(e.target.value) });

  const category = typeMap[form.property_type]?.category;
  const isPlot = ['residential_plot', 'commercial_plot'].includes(form.property_type);
  const city = (cities.data || []).find((c) => String(c.id) === String(form.city));
  const isMonthly = form.listing_type !== 'buy';

  const reloadImages = async () => {
    const { data } = await adminApi.get(`/properties/${id}/`);
    property.setData(data);
  };

  const submit = async (event) => {
    event.preventDefault();
    const missing = {};
    if (!form.title.trim()) missing.title = 'Enter a title.';
    if (!form.property_type) missing.property_type = 'Choose a property type.';
    if (!(Number(form.price) > 0)) missing.price = 'Enter the price in rupees.';
    if (!(Number(form.area) > 0)) missing.area = 'Enter the area.';
    if (!form.city) missing.city = 'Choose a city.';
    if (Object.keys(missing).length) {
      setErrors(missing);
      toast.error('Please fill in the required fields.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const { data } = await adminApi.patch(`/properties/${id}/`, toPayload(form));
        property.setData(data);
        toast.success('Property saved.');
      } else {
        const { data } = await adminApi.post('/properties/', toPayload(form));
        if (pending.length) {
          const upload = new FormData();
          pending.forEach((f) => upload.append('images', f));
          try {
            await adminApi.post(`/properties/${data.id}/images/`, upload);
          } catch (err) {
            toast.error(`Property saved, but photos failed: ${errorMessage(err)}`);
          }
          setPending([]);
        }
        toast.success('Property created.');
        navigate(`/dashboard/properties/${data.id}/edit`, { replace: true });
      }
      setErrors({});
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, 'Could not save the property.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        back={{ to: '/dashboard/properties', label: 'All properties' }}
        title={isEdit ? property.data.title : 'Add Property'}
        subtitle={isEdit ? `Last updated ${new Date(property.data.updated_at).toLocaleString('en-IN')}` : 'Fields marked * are required.'}
        actions={(
          <>
            {isEdit && property.data.status === 'available' && (
              <a href={`/properties/${property.data.slug}`} target="_blank" rel="noreferrer" className="btn btn--outline">
                <ExternalLink size={18} /> View on website
              </a>
            )}
            <button type="submit" className="btn btn--gold" disabled={saving}><Save size={18} /> {saving ? 'Saving…' : 'Save Property'}</button>
          </>
        )}
      />

      <div className="dash-form-layout">
        <div className="dash-form-main">
          <Panel title="Basic details">
            <div className="dash-form-grid">
              <Field label="Title" required error={errors.title} className="span-2">
                <input type="text" {...input('title')} placeholder="e.g. 3 BHK Flat in Indirapuram" maxLength={200} />
              </Field>
              <Field label="Listing for" required error={errors.listing_type}>
                <SelectInput value={form.listing_type} onChange={set('listing_type')} options={LISTING_TYPES.map((l) => ({ value: l.value, label: l.badge }))} />
              </Field>
              <Field label="Property type" required error={errors.property_type} hint={category ? `Category: ${category.charAt(0).toUpperCase()}${category.slice(1)}` : undefined}>
                <select value={form.property_type} onChange={(e) => set('property_type')(e.target.value)}>
                  <option value="">Choose type</option>
                  {categories.map((cat) => (
                    <optgroup key={cat.value} label={cat.label}>
                      {cat.property_types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="Status" error={errors.status}>
                <SelectInput value={form.status} onChange={set('status')} options={PROPERTY_STATUSES} />
              </Field>
              <label className="dash-check">
                <input type="checkbox" checked={form.featured} onChange={(e) => set('featured')(e.target.checked)} />
                <span>Featured on homepage</span>
              </label>
            </div>
          </Panel>

          <Panel title="Price & area">
            <div className="dash-form-grid">
              <Field label={isMonthly ? 'Monthly rent (₹)' : 'Price (₹)'} required error={errors.price}
                     hint={Number(form.price) > 0 ? formatPrice(form.price) + (isMonthly ? ' per month' : '') : 'Enter the full amount in rupees'}>
                <input type="number" inputMode="numeric" min="1" {...input('price')} />
              </Field>
              <Field label="Area" required error={errors.area}>
                <div className="dash-input-group">
                  <input type="number" inputMode="decimal" min="0" step="any" {...input('area')} />
                  <SelectInput value={form.area_unit} onChange={set('area_unit')} options={AREA_UNIT_OPTIONS} aria-label="Area unit" />
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title="Location">
            <div className="dash-form-grid">
              <Field label="City" required error={errors.city}>
                <SelectInput value={form.city} onChange={set('city')} placeholder="Choose city"
                             options={(cities.data || []).map((c) => ({ value: c.id, label: c.is_active ? c.name : `${c.name} (hidden)` }))} />
              </Field>
              <Field label="Locality / Sector" error={errors.locality}>
                <SelectInput value={form.locality} onChange={set('locality')} placeholder={city ? 'Choose locality' : 'Choose a city first'}
                             disabled={!city}
                             options={(city?.localities || []).map((l) => ({ value: l.id, label: l.is_active ? l.name : `${l.name} (hidden)` }))} />
              </Field>
              <Field label="Address" error={errors.address} className="span-2">
                <input type="text" {...input('address')} placeholder="Block / street / landmark" maxLength={300} />
              </Field>
            </div>
          </Panel>

          <Panel title="Specifications">
            <div className="dash-form-grid dash-form-grid--3">
              {!isPlot && category !== 'commercial' && (
                <Field label="Bedrooms (BHK)" error={errors.bedrooms}><input type="number" min="0" inputMode="numeric" {...input('bedrooms')} /></Field>
              )}
              {!isPlot && <Field label="Bathrooms" error={errors.bathrooms}><input type="number" min="0" inputMode="numeric" {...input('bathrooms')} /></Field>}
              {!isPlot && category !== 'commercial' && (
                <Field label="Balconies" error={errors.balconies}><input type="number" min="0" inputMode="numeric" {...input('balconies')} /></Field>
              )}
              {!isPlot && (
                <Field label="Furnishing" error={errors.furnishing_status}>
                  <SelectInput value={form.furnishing_status} onChange={set('furnishing_status')} placeholder="Not specified" options={FURNISHING_OPTIONS} />
                </Field>
              )}
              {!isPlot && <Field label="Floor (0 = ground)" error={errors.floor}><input type="number" inputMode="numeric" {...input('floor')} /></Field>}
              {!isPlot && <Field label="Total floors" error={errors.total_floors}><input type="number" min="0" inputMode="numeric" {...input('total_floors')} /></Field>}
              <Field label="Facing" error={errors.facing}>
                <SelectInput value={form.facing} onChange={set('facing')} placeholder="Not specified" options={FACING_OPTIONS} />
              </Field>
              {!isPlot && <Field label="Parking spaces" error={errors.parking}><input type="number" min="0" inputMode="numeric" {...input('parking')} /></Field>}
              <Field label="Possession" error={errors.possession_status}>
                <SelectInput value={form.possession_status} onChange={set('possession_status')} placeholder="Not specified" options={POSSESSION_OPTIONS} />
              </Field>
              {!isPlot && (
                <Field label="Property age" error={errors.property_age}>
                  <SelectInput value={form.property_age} onChange={set('property_age')} placeholder="Not specified" options={AGE_OPTIONS} />
                </Field>
              )}
            </div>
          </Panel>

          <Panel title="Description">
            <Field label="Description" error={errors.description}>
              <textarea rows={6} {...input('description')} placeholder="Highlights, nearby landmarks, connectivity…" />
            </Field>
          </Panel>
        </div>

        <div className="dash-form-side">
          <Panel title="Photos">
            <PhotoManager
              propertyId={isEdit ? Number(id) : null}
              images={property.data?.images || []}
              onChange={reloadImages}
              pending={pending}
              onPendingChange={setPending}
            />
          </Panel>

          <Panel title="Amenities">
            {amenities.loading && <Loader label="Loading amenities…" />}
            <div className="dash-checks">
              {(amenities.data || []).map((a) => (
                <label key={a.id} className="dash-check">
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(a.id)}
                    onChange={(e) => set('amenities')(e.target.checked ? [...form.amenities, a.id] : form.amenities.filter((x) => x !== a.id))}
                  />
                  <span>{a.name}</span>
                </label>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="dash-sticky-save">
        <button type="submit" className="btn btn--gold btn--block" disabled={saving}><Save size={18} /> {saving ? 'Saving…' : 'Save Property'}</button>
      </div>
    </form>
  );
}
