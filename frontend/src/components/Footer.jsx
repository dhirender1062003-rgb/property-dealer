import { Link } from 'react-router-dom';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import Logo from './Logo';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useTaxonomy } from '../context/TaxonomyContext';
import { telLink, whatsappLink } from '../utils/format';

const YEAR = new Date().getFullYear();

export default function Footer() {
  const settings = useSiteSettings();
  const { cities, propertyTypes } = useTaxonomy();

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Logo light />
          <p>
            Buy, rent and lease residential and commercial properties across Ghaziabad, Noida and
            Greater Noida, with honest advice at every step.
          </p>
        </div>

        <div>
          <h3 className="footer__title">Quick Links</h3>
          <ul className="footer__links">
            <li><Link to="/properties?listing_type=buy">Properties for Sale</Link></li>
            <li><Link to="/properties?listing_type=rent">Properties for Rent</Link></li>
            <li><Link to="/properties?listing_type=lease">Properties for Lease</Link></li>
            <li><Link to="/properties?category=commercial">Commercial Spaces</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="footer__title">Property Types</h3>
          <ul className="footer__links footer__links--two-col">
            {propertyTypes.map((type) => (
              <li key={type.value}>
                <Link to={`/properties?property_type=${type.value}`}>{type.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="footer__title">Areas We Cover</h3>
          <ul className="footer__links">
            {cities.map((city) => (
              <li key={city.slug}>
                <Link to={`/properties?city=${city.slug}`}>{city.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="footer__title">Get in Touch</h3>
          <ul className="footer__contact">
            {settings.phone && (
              <li><Phone size={16} /><a href={telLink(settings.phone)}>{settings.phone}</a></li>
            )}
            {settings.whatsapp && (
              <li>
                <MessageCircle size={16} />
                <a href={whatsappLink(settings.whatsapp)} target="_blank" rel="noreferrer">Chat on WhatsApp</a>
              </li>
            )}
            {settings.email && (
              <li><Mail size={16} /><a href={`mailto:${settings.email}`}>{settings.email}</a></li>
            )}
            {settings.address && <li><MapPin size={16} /><span>{settings.address}</span></li>}
            {settings.business_hours && <li><Clock size={16} /><span>{settings.business_hours}</span></li>}
          </ul>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <span>© {YEAR} {settings.business_name}. All rights reserved.</span>
          <span>
            {cities.map((c) => c.name).join(' · ')}
            {' · '}
            <Link to="/dashboard/login" className="footer__staff">Staff Login</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
