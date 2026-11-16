import { useSearchParams } from 'react-router-dom';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import PageBanner from '../components/PageBanner';
import InquiryForm from '../components/InquiryForm';
import { INQUIRY_TYPES } from '../constants/options';
import { useTaxonomy } from '../context/TaxonomyContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { telLink, whatsappLink } from '../utils/format';

export default function ContactPage() {
  useDocumentTitle('Contact Us');
  const settings = useSiteSettings();
  const { cities } = useTaxonomy();
  const [searchParams] = useSearchParams();
  // e.g. /contact?interest=sell preselects "I want to sell my property"
  const interest = searchParams.get('interest');
  const inquiryType = INQUIRY_TYPES.some((t) => t.value === interest) ? interest : '';

  const contactItems = [
    settings.phone && { icon: Phone, label: 'Call Us', value: settings.phone, href: telLink(settings.phone) },
    settings.whatsapp && {
      icon: MessageCircle, label: 'WhatsApp', value: 'Chat with us', href: whatsappLink(settings.whatsapp), external: true,
    },
    settings.email && { icon: Mail, label: 'Email', value: settings.email, href: `mailto:${settings.email}` },
    settings.address && { icon: MapPin, label: 'Office', value: settings.address },
    settings.business_hours && { icon: Clock, label: 'Working Hours', value: settings.business_hours },
  ].filter(Boolean);

  return (
    <>
      <PageBanner
        title="Contact Us"
        subtitle="Looking to buy, rent, lease or sell? Send us your requirement and we will get back to you."
        crumbs={[{ label: 'Contact Us' }]}
      />

      <section className="section">
        <div className="container contact-layout">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <p>Reach us by phone, WhatsApp or email, or fill in the form and our team will contact you.</p>
            <ul className="contact-list">
              {contactItems.map(({ icon: Icon, label, value, href, external }) => (
                <li key={label} className="contact-item">
                  <span className="contact-item__icon"><Icon size={22} /></span>
                  <span>
                    <span className="contact-item__label">{label}</span>
                    {href ? (
                      <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>{value}</a>
                    ) : (
                      <span className="contact-item__value">{value}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div className="contact-areas">
              <h3>Areas We Cover</h3>
              <ul>
                {cities.map((c) => <li key={c.slug}><MapPin size={14} /> {c.name}</li>)}
              </ul>
            </div>
          </div>

          <div className="detail-card contact-form-card">
            <h2>Send Us a Message</h2>
            <p className="detail-sidebar__hint">Fields marked * are required.</p>
            <InquiryForm key={inquiryType} inquiryType={inquiryType} />
          </div>
        </div>
      </section>
    </>
  );
}
