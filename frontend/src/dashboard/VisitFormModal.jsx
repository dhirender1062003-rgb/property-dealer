import { useState } from 'react';
import adminApi, { errorMessage, fieldErrors } from './adminApi';
import { useUI, Modal } from './ui';
import { useTeam } from './hooks';
import { AsyncSelect, Field, SelectInput } from './components';
import { fromLocalInput, toLocalInput } from './format';
import { VISIT_STATUSES } from './constants';
import { loadCustomers, loadProperties } from './loaders';


const nextHour = () => {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  d.setHours(11);
  return d.toISOString();
};

/**
 * Schedule or edit a site visit.
 * visit: existing visit (edit) or null; preset: { customer, property, inquiry } options for new visits.
 */
export default function VisitFormModal({ visit = null, preset = {}, onClose, onSaved }) {
  const { toast } = useUI();
  const team = useTeam();
  const [customer, setCustomer] = useState(visit
    ? { value: visit.customer, label: visit.customer_name, sub: visit.customer_phone } : preset.customer ?? null);
  const [property, setProperty] = useState(visit
    ? (visit.property ? { value: visit.property, label: visit.property_title, sub: visit.property_location } : null)
    : preset.property ?? null);
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(visit?.scheduled_at ?? nextHour()));
  const [status, setStatus] = useState(visit?.status ?? 'scheduled');
  const [assignedTo, setAssignedTo] = useState(visit?.assigned_to ?? '');
  const [notes, setNotes] = useState(visit?.notes ?? '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const missing = {};
    if (!customer) missing.customer = 'Choose a customer.';
    if (!property) missing.property = 'Choose a property.';
    if (!scheduledAt) missing.scheduled_at = 'Choose a date and time.';
    setErrors(missing);
    if (Object.keys(missing).length) return;

    const payload = {
      customer: customer.value,
      property: property.value,
      scheduled_at: fromLocalInput(scheduledAt),
      status,
      assigned_to: assignedTo || null,
      notes,
      ...(preset.inquiry && !visit ? { inquiry: preset.inquiry } : {}),
    };
    setSaving(true);
    try {
      const { data } = visit
        ? await adminApi.patch(`/site-visits/${visit.id}/`, payload)
        : await adminApi.post('/site-visits/', payload);
      toast.success(visit ? 'Site visit updated.' : 'Site visit scheduled.');
      onSaved(data);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, 'Could not save the visit.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={visit ? 'Edit Site Visit' : 'Schedule Site Visit'}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Visit'}</button>
        </>
      )}
    >
      <div className="dash-form-grid">
        <Field label="Customer" required error={errors.customer} className="span-2">
          <AsyncSelect value={customer} onChange={setCustomer} load={loadCustomers}
                       placeholder="Search customer by name or phone" disabled={Boolean(preset.inquiry) || Boolean(visit)} />
        </Field>
        <Field label="Property" required error={errors.property} className="span-2">
          <AsyncSelect value={property} onChange={setProperty} load={loadProperties} placeholder="Search property by title or locality" />
        </Field>
        <Field label="Date & time" required error={errors.scheduled_at}>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </Field>
        <Field label="Assigned to" error={errors.assigned_to}>
          <SelectInput value={assignedTo} onChange={setAssignedTo} placeholder="Unassigned"
                       options={team.map((u) => ({ value: u.id, label: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username }))} />
        </Field>
        {visit && (
          <Field label="Status" error={errors.status}>
            <SelectInput value={status} onChange={setStatus} options={VISIT_STATUSES} />
          </Field>
        )}
        <Field label="Notes" error={errors.notes} className="span-2">
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Meeting point, keys, customer requirements…" />
        </Field>
      </div>
    </Modal>
  );
}
