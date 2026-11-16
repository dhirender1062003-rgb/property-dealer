import { useState } from 'react';
import { Save } from 'lucide-react';
import adminApi, { errorMessage, fieldErrors } from '../adminApi';
import { useUI } from '../ui';
import { useResource } from '../hooks';
import { Field, PageHeader, Panel } from '../components';
import { SOCIAL_NETWORKS } from '../constants';
import { checkFiles } from '../files';
import { ErrorState, Loader } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const FIELDS = ['business_name', 'tagline', 'phone', 'whatsapp_number', 'email', 'address', 'office_hours'];

export default function SettingsPage() {
  useDocumentTitle('Website Settings');
  const { toast } = useUI();
  const [form, setForm] = useState(null);
  const [logo, setLogo] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const settings = useResource(async () => {
    const { data } = await adminApi.get('/site-settings/');
    setForm({ ...Object.fromEntries(FIELDS.map((f) => [f, data[f] ?? ''])), social_links: { ...(data.social_links || {}) } });
    return data;
  }, 'settings');

  if (settings.loading || !form) {
    return settings.error ? <ErrorState message={errorMessage(settings.error)} onRetry={settings.reload} /> : <Loader label="Loading settings…" />;
  }

  const input = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  const chooseLogo = (file) => {
    if (!file) return setLogo(null);
    const { ok, problems } = checkFiles([file]);
    problems.forEach((p) => toast.error(p));
    setLogo(ok[0] ?? null);
    return undefined;
  };

  const save = async (event) => {
    event.preventDefault();
    const socialLinks = Object.fromEntries(Object.entries(form.social_links).filter(([, url]) => url.trim()));
    setSaving(true);
    try {
      let body = { ...form, social_links: socialLinks };
      if (logo) {
        body = new FormData();
        FIELDS.forEach((f) => body.append(f, form[f]));
        body.append('social_links', JSON.stringify(socialLinks));
        body.append('logo', logo);
      }
      const { data } = await adminApi.patch('/site-settings/', body);
      settings.setData(data);
      setLogo(null);
      setErrors({});
      toast.success('Website settings saved. Visitors see the changes on their next page load.');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, 'Could not save settings.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate>
      <PageHeader title="Website Settings" subtitle="Contact details shown across the public website."
                  actions={<button type="submit" className="btn btn--gold" disabled={saving}><Save size={18} /> {saving ? 'Saving…' : 'Save Settings'}</button>} />

      <div className="dash-grid-2">
        <Panel title="Business">
          <Field label="Business name" required error={errors.business_name}><input type="text" {...input('business_name')} /></Field>
          <Field label="Tagline" error={errors.tagline}><input type="text" {...input('tagline')} maxLength={200} /></Field>
          <Field label="Logo" error={errors.logo} hint="Square JPG, PNG or WebP works best (max 5 MB).">
            <div className="dash-logo-row">
              {(logo || settings.data.logo) && (
                <img src={logo ? URL.createObjectURL(logo) : settings.data.logo} alt="Current logo" className="dash-logo-preview" />
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => chooseLogo(e.target.files[0])} />
            </div>
          </Field>
        </Panel>

        <Panel title="Contact details">
          <Field label="Phone" error={errors.phone} hint="10-digit mobile number, used for Call buttons.">
            <input type="tel" inputMode="tel" {...input('phone')} placeholder="9876543210" />
          </Field>
          <Field label="WhatsApp number" error={errors.whatsapp_number} hint="With country code, digits only, e.g. 919876543210.">
            <input type="tel" inputMode="numeric" {...input('whatsapp_number')} placeholder="919876543210" />
          </Field>
          <Field label="Email" error={errors.email}><input type="email" {...input('email')} /></Field>
          <Field label="Office address" error={errors.address}><input type="text" {...input('address')} /></Field>
          <Field label="Office hours" error={errors.office_hours}><input type="text" {...input('office_hours')} placeholder="Mon - Sun: 10:00 AM - 7:00 PM" /></Field>
        </Panel>
      </div>

      <Panel title="Social media links">
        <div className="dash-form-grid">
          {SOCIAL_NETWORKS.map(({ key, label }) => (
            <Field key={key} label={label} error={key === SOCIAL_NETWORKS[0].key ? errors.social_links : undefined}>
              <input type="url" inputMode="url" placeholder={`https://${key === 'x' ? 'x' : key}.com/yourpage`}
                     value={form.social_links[key] || ''}
                     onChange={(e) => setForm((f) => ({ ...f, social_links: { ...f.social_links, [key]: e.target.value } }))} />
            </Field>
          ))}
        </div>
      </Panel>
      <div className="dash-sticky-save">
        <button type="submit" className="btn btn--gold btn--block" disabled={saving}><Save size={18} /> {saving ? 'Saving…' : 'Save Settings'}</button>
      </div>
    </form>
  );
}
