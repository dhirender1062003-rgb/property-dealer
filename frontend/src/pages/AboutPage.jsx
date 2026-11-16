import { Link } from 'react-router-dom';
import {
  ArrowRight, Building2, FileText, Gem, Handshake, House, KeyRound, MapPin, Search, ShieldCheck,
} from 'lucide-react';
import PageBanner from '../components/PageBanner';
import SectionHeading from '../components/SectionHeading';
import { useTaxonomy } from '../context/TaxonomyContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSiteSettings } from '../context/SiteSettingsContext';

const ABOUT_IMAGE = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=75';

const SERVICES = [
  { icon: House, title: 'Residential Sales', text: 'Flats, apartments, independent houses, villas and residential plots for end users and investors.' },
  { icon: KeyRound, title: 'Rentals', text: 'Homes and commercial spaces on rent, with help on agreements, police verification and move-in.' },
  { icon: Building2, title: 'Commercial Leasing', text: 'Shops, offices, showrooms and warehouses on lease for retailers, startups and businesses.' },
  { icon: Search, title: 'Property Search', text: 'Tell us your budget and needs; we shortlist suitable options and arrange site visits.' },
  { icon: Handshake, title: 'Owner Services', text: 'Selling or renting out? We market your property and bring you genuine buyers and tenants.' },
  { icon: FileText, title: 'Documentation', text: 'Guidance on sale deeds, lease deeds, rent agreements and registration formalities.' },
];

const VALUES = [
  { icon: ShieldCheck, title: 'Honesty', text: 'Accurate property details and clear advice, even when the answer is “this is not the right one for you”.' },
  { icon: MapPin, title: 'Local Expertise', text: 'Focused on Ghaziabad, Noida and Greater Noida, sector by sector.' },
  { icon: Gem, title: 'Quality Service', text: 'Personal attention from the first call to the day you receive the keys.' },
];

export default function AboutPage() {
  useDocumentTitle('About Us');
  const { business_name: businessName } = useSiteSettings();
  const { cities } = useTaxonomy();

  return (
    <>
      <PageBanner
        title={`About ${businessName}`}
        subtitle="Your local partner for buying, renting and leasing property in Noida and Ghaziabad."
        crumbs={[{ label: 'About Us' }]}
      />

      <section className="section">
        <div className="container about-intro">
          <div className="about-intro__media">
            <img src={ABOUT_IMAGE} alt="Elegant modern living room" loading="lazy" />
          </div>
          <div className="about-intro__text">
            <span className="eyebrow">Who We Are</span>
            <h2>Real estate guidance you can rely on</h2>
            <p>
              {businessName} is a real estate consultancy serving all of Ghaziabad, every Noida sector, Greater
              Noida and Noida Extension. We help families find homes, investors find the right opportunities
              and businesses find spaces that work for them.
            </p>
            <p>
              From a first rented flat to a luxury villa, a high-street shop or a large warehouse, we handle
              residential and commercial properties for sale, rent and lease. Our aim is simple: give you clear
              information, fair options and a smooth transaction.
            </p>
            <div className="about-intro__actions">
              <Link to="/properties" className="btn btn--gold">
                Browse Properties <ArrowRight size={18} />
              </Link>
              <Link to="/contact" className="btn btn--outline">Talk to Us</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container">
          <SectionHeading eyebrow="What We Do" title="Our Services" subtitle="Complete real estate support under one roof." />
          <div className="service-grid">
            {SERVICES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="service-card">
                <span className="service-card__icon"><Icon size={26} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="Our Values" title="How We Work" />
          <div className="value-grid">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="value-card">
                <Icon size={30} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--navy">
        <div className="container">
          <SectionHeading light eyebrow="Coverage" title="Areas We Serve" />
          <div className="coverage-grid">
            {cities.map((city) => (
              <Link key={city.slug} to={`/properties?city=${city.slug}`} className="coverage-card">
                <h3><MapPin size={18} /> {city.name}</h3>
                <p>{city.description || `${city.localities.slice(0, 8).map((l) => l.name).join(', ')} and more`}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
