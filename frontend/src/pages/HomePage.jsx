import { Link } from 'react-router-dom';
import {
  ArrowRight, Briefcase, Building, Building2, Factory, FileText, Handshake, Home, House, KeyRound, LandPlot,
  Landmark, MapPin, Phone, ShieldCheck, Store, Tractor, TreePalm, Warehouse,
} from 'lucide-react';
import HeroSearch from '../components/HeroSearch';
import PropertyCard from '../components/PropertyCard';
import SectionHeading from '../components/SectionHeading';
import SampleDataNotice from '../components/SampleDataNotice';
import { ErrorState, EmptyState, Loader } from '../components/StatusMessage';
import { CITY_IMAGES, DEFAULT_CITY_IMAGE } from '../constants/options';
import { useProperties } from '../hooks/useProperties';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useTaxonomy } from '../context/TaxonomyContext';
import { telLink } from '../utils/format';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=2000&q=75';

const TYPE_ICONS = {
  flat: Building2,
  apartment: Building,
  independent_house: House,
  villa: TreePalm,
  builder_floor: Home,
  residential_plot: LandPlot,
  farm_house: Tractor,
  shop: Store,
  showroom: Store,
  office: Briefcase,
  commercial_building: Landmark,
  warehouse: Warehouse,
  industrial: Factory,
  commercial_plot: LandPlot,
};

const REASONS = [
  {
    icon: MapPin,
    title: 'Local Market Knowledge',
    text: 'We work only in Ghaziabad, Noida and Greater Noida (including Noida Extension), so we know the sectors, societies and fair prices.',
  },
  {
    icon: KeyRound,
    title: 'Buy, Rent or Lease',
    text: 'Whether you want to own, rent or lease, we help you compare options and shortlist what fits your needs.',
  },
  {
    icon: ShieldCheck,
    title: 'Transparent Dealings',
    text: 'Clear pricing, honest property details and no hidden surprises from the first visit to the final handover.',
  },
  {
    icon: FileText,
    title: 'Paperwork Guidance',
    text: 'Help with agreements, documentation and registration so your transaction stays smooth and stress-free.',
  },
];

const FEATURED_PARAMS = { featured: 'true', ordering: '-created_at', page_size: '6' };

export default function HomePage() {
  useDocumentTitle('Buy, Rent & Lease Properties in Noida & Ghaziabad');
  const settings = useSiteSettings();
  const { cities, propertyTypes } = useTaxonomy();
  const featured = useProperties(FEATURED_PARAMS);
  const featuredList = featured.data?.results.slice(0, 6) ?? [];

  return (
    <>
      {/* Hero */}
      <section className="hero" style={{ '--hero-image': `url(${HERO_IMAGE})` }}>
        <div className="container hero__inner">
          <span className="eyebrow eyebrow--light">Premium Real Estate · Delhi NCR</span>
          <h1>
            Find Your Perfect Property in <span className="text-gold">Noida &amp; Ghaziabad</span>
          </h1>
          <p className="hero__lead">
            Homes, villas, plots, shops, offices and warehouses to buy, rent or lease across Ghaziabad,
            Noida, Greater Noida and Noida Extension.
          </p>
          <HeroSearch />
          <ul className="hero__areas">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link to={`/properties?city=${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Browse by type */}
      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Property Types"
            title="Explore by Property Type"
            subtitle="From compact flats to large warehouses, browse the kind of property you are looking for."
          />
          <div className="type-grid">
            <Link to="/properties?category=residential" className="type-tile type-tile--category">
              <House size={28} />
              <span>All Residential</span>
            </Link>
            <Link to="/properties?category=commercial" className="type-tile type-tile--category">
              <Building2 size={28} />
              <span>All Commercial</span>
            </Link>
            {propertyTypes.map((type) => {
              const Icon = TYPE_ICONS[type.value] ?? Building;
              return (
                <Link key={type.value} to={`/properties?property_type=${type.value}`} className="type-tile">
                  <Icon size={28} />
                  <span>{type.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured properties */}
      <section className="section section--tint">
        <div className="container">
          <div className="section-head-row">
            <SectionHeading
              align="left"
              eyebrow="Handpicked"
              title="Featured Properties"
              subtitle="A selection of standout homes and commercial spaces."
            />
            <Link to="/properties" className="btn btn--outline">
              View All Properties <ArrowRight size={18} />
            </Link>
          </div>

          {featured.data?.isSample && <SampleDataNotice />}
          {featured.loading && <Loader label="Loading featured properties…" />}
          {featured.error && (
            <ErrorState message="We couldn't load featured properties." onRetry={featured.retry} />
          )}
          {!featured.loading && !featured.error && featuredList.length === 0 && (
            <EmptyState title="No featured properties yet" message="Browse all available listings instead.">
              <Link to="/properties" className="btn btn--navy">Browse Properties</Link>
            </EmptyState>
          )}
          {featuredList.length > 0 && (
            <div className="property-grid">
              {featuredList.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Locations */}
      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Coverage"
            title="Areas We Serve"
            subtitle="Complete coverage of Ghaziabad, every Noida sector and Greater Noida, including Noida Extension."
          />
          <div className="location-grid">
            {cities.map((city) => (
              <Link
                key={city.slug}
                to={`/properties?city=${city.slug}`}
                className="location-card"
                style={{ '--location-image': `url(${city.image || CITY_IMAGES[city.slug] || DEFAULT_CITY_IMAGE})` }}
              >
                <div className="location-card__content">
                  <h3>{city.name}</h3>
                  <p>{city.localities.slice(0, 4).map((l) => l.name).join(' · ')}</p>
                  <span className="location-card__link">
                    View properties <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="section section--navy">
        <div className="container">
          <SectionHeading
            light
            eyebrow="Why Property Dealer"
            title="Your Trusted Real Estate Partner"
            subtitle="We make finding, buying, renting and leasing property simple and transparent."
          />
          <div className="reason-grid">
            {REASONS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="reason-card">
                <span className="reason-card__icon"><Icon size={26} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <span className="eyebrow">Property Owners</span>
              <h2>Want to sell, rent out or lease your property?</h2>
              <p>Tell us about your property and we will help you find the right buyer or tenant.</p>
            </div>
            <div className="cta-band__actions">
              <Link to="/contact?interest=sell" className="btn btn--gold">
                <Handshake size={18} /> List Your Property
              </Link>
              {settings.phone && (
                <a href={telLink(settings.phone)} className="btn btn--outline-light">
                  <Phone size={18} /> {settings.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
