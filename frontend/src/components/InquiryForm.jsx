import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CircleCheck, MessageCircle, Phone, TriangleAlert } from 'lucide-react';
import { INQUIRY_BUDGETS, INQUIRY_TYPES } from '../constants/options';
import { RateLimitError, ServiceUnavailableError, ValidationError, submitInquiry } from '../services/inquiries';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useTaxonomy } from '../context/TaxonomyContext';
import { propertyLocation, telLink, whatsappLink } from '../utils/format';

const PHONE_PATTERN = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initialValues(property, inquiryType) {
  return {
    customer_name: '',
    phone: '',
    email: '',
    inquiry_type: property ? property.listing_type : inquiryType || 'buy',
    preferred_city: property?.city || '',
    budget: '',
    message: property
      ? `Hi, I am interested in "${property.title}" (${propertyLocation(property)}). Please share more details.`
      : '',
    website: '', // honeypot: hidden from people, bots fill it in
  };
}

function validate(values) {
  const errors = {};
  if (values.customer_name.trim().length < 2) errors.customer_name = 'Please enter your name.';
  if (!PHONE_PATTERN.test(values.phone.replace(/[\s-]/g, ''))) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }
  if (values.email && !EMAIL_PATTERN.test(values.email)) errors.email = 'Enter a valid email address.';
  if (values.message.trim().length < 10) errors.message = 'Please write a short message (at least 10 characters).';
  return errors;
}

/**
 * Enquiry form. Sends to Django POST /api/inquiries/ and shows success only
 * after Django confirms the enquiry was saved. If the service is unavailable,
 * the visitor is told clearly and can send the same message on WhatsApp.
 */
export default function InquiryForm({ property = null, inquiryType = '', compact = false }) {
  const settings = useSiteSettings();
  const { cities } = useTaxonomy();
  const location = useLocation();
  const [values, setValues] = useState(() => initialValues(property, inquiryType));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success | unavailable | limited | error
  const [formError, setFormError] = useState('');

  const update = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setStatus('submitting');
    try {
      await submitInquiry({
        ...values,
        customer_name: values.customer_name.trim(),
        message: values.message.trim(),
        preferred_city: values.preferred_city || null,
        // Browser-only sample listings are not in the database, so they are not linked.
        property: property && !property.is_local_sample ? property.id : null,
        source_page: location.pathname,
      });
      setStatus('success');
      setValues(initialValues(property, inquiryType));
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors(error.fieldErrors);
        setFormError(error.fieldErrors.non_field_errors || '');
        setStatus('idle');
      } else if (error instanceof RateLimitError) {
        setStatus('limited');
      } else if (error instanceof ServiceUnavailableError) {
        setStatus('unavailable');
      } else {
        setStatus('error');
      }
    }
  };

  const whatsappText = [
    `Name: ${values.customer_name}`,
    `Phone: ${values.phone}`,
    values.email && `Email: ${values.email}`,
    `Enquiry: ${INQUIRY_TYPES.find((t) => t.value === values.inquiry_type)?.label ?? values.inquiry_type}`,
    values.budget && `Budget: ${values.budget}`,
    values.message,
  ]
    .filter(Boolean)
    .join('\n');

  if (status === 'success') {
    return (
      <div className="form-result form-result--success" role="status">
        <CircleCheck size={40} />
        <h3>Thank you! Your enquiry has been sent.</h3>
        <p>Our team will get back to you shortly.</p>
        <button type="button" className="btn btn--outline" onClick={() => setStatus('idle')}>
          Send another enquiry
        </button>
      </div>
    );
  }

  const fieldClass = (name) => `field ${errors[name] ? 'field--error' : ''}`;
  const budgetOptions = values.inquiry_type === 'rent' || values.inquiry_type === 'lease'
    ? INQUIRY_BUDGETS.monthly
    : INQUIRY_BUDGETS.buy;
  const showWhatsApp = status === 'unavailable' || status === 'limited' || status === 'error';

  return (
    <form className={`inquiry-form ${compact ? 'inquiry-form--compact' : ''}`} onSubmit={handleSubmit} noValidate>
      {/* Honeypot field: invisible to people, left empty by real visitors */}
      <div className="hp-field" aria-hidden="true">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={values.website} onChange={update('website')} />
        </label>
      </div>

      <div className="form-grid">
        <label className={fieldClass('customer_name')}>
          <span className="field__label">Full Name *</span>
          <input type="text" value={values.customer_name} onChange={update('customer_name')} autoComplete="name" />
          {errors.customer_name && <span className="field__error">{errors.customer_name}</span>}
        </label>

        <label className={fieldClass('phone')}>
          <span className="field__label">Mobile Number *</span>
          <input
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={update('phone')}
            autoComplete="tel"
            placeholder="10-digit mobile number"
          />
          {errors.phone && <span className="field__error">{errors.phone}</span>}
        </label>

        <label className={`${fieldClass('email')} ${compact ? 'form-grid__full' : ''}`}>
          <span className="field__label">Email</span>
          <input type="email" inputMode="email" value={values.email} onChange={update('email')} autoComplete="email" />
          {errors.email && <span className="field__error">{errors.email}</span>}
        </label>

        {!compact && (
          <label className={fieldClass('inquiry_type')}>
            <span className="field__label">I am interested in</span>
            <select value={values.inquiry_type} onChange={update('inquiry_type')}>
              {INQUIRY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.inquiry_type && <span className="field__error">{errors.inquiry_type}</span>}
          </label>
        )}

        {!compact && (
          <label className={fieldClass('preferred_city')}>
            <span className="field__label">Preferred Location</span>
            <select value={values.preferred_city} onChange={update('preferred_city')}>
              <option value="">Any location</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            {errors.preferred_city && <span className="field__error">{errors.preferred_city}</span>}
          </label>
        )}

        <label className={`${fieldClass('budget')} ${compact ? 'form-grid__full' : ''}`}>
          <span className="field__label">Budget</span>
          <select value={values.budget} onChange={update('budget')}>
            <option value="">Select budget (optional)</option>
            {budgetOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {errors.budget && <span className="field__error">{errors.budget}</span>}
        </label>

        <label className={`${fieldClass('message')} form-grid__full`}>
          <span className="field__label">Message *</span>
          <textarea rows={compact ? 4 : 5} value={values.message} onChange={update('message')} />
          {errors.message && <span className="field__error">{errors.message}</span>}
        </label>
      </div>

      {formError && (
        <div className="form-result form-result--warning" role="alert">
          <TriangleAlert size={22} />
          <div><strong>{formError}</strong></div>
        </div>
      )}

      {showWhatsApp && (
        <div className="form-result form-result--warning" role="alert">
          <TriangleAlert size={22} />
          <div>
            <strong>Your message was not sent.</strong>
            <p>
              {status === 'limited'
                ? 'Too many enquiries were sent from this connection. Please try again later, or contact us directly.'
                : status === 'unavailable'
                  ? 'Online enquiries are not available right now. You can send the same details on WhatsApp or call us.'
                  : 'Something went wrong. Please try again in a moment, or contact us directly.'}
            </p>
            <div className="form-result__actions">
              {settings.whatsapp && (
                <a className="btn btn--whatsapp" href={whatsappLink(settings.whatsapp, whatsappText)} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} /> Send on WhatsApp
                </a>
              )}
              {settings.phone && (
                <a className="btn btn--outline" href={telLink(settings.phone)}>
                  <Phone size={18} /> Call {settings.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <button type="submit" className="btn btn--gold btn--block" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : 'Send Enquiry'}
      </button>
    </form>
  );
}
