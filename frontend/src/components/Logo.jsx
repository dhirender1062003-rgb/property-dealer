import { Link } from 'react-router-dom';
import { useSiteSettings } from '../context/SiteSettingsContext';

export default function Logo({ light = false, onClick }) {
  const { business_name: businessName, logo } = useSiteSettings();
  return (
    <Link to="/" className={`logo ${light ? 'logo--light' : ''}`} onClick={onClick} aria-label={`${businessName} home`}>
      {logo ? (
        // Logo uploaded in Dashboard → Website Settings
        <img className="logo__mark logo__img" src={logo} alt="" />
      ) : (
        <svg className="logo__mark" viewBox="0 0 64 64" aria-hidden="true">
          <rect width="64" height="64" rx="14" fill="#0F2547" />
          <path d="M32 13 12 29v4h5v18h11V40h8v11h11V33h5v-4L32 13Z" fill="#C9A24B" />
        </svg>
      )}
      <span className="logo__text">
        <span className="logo__name">{businessName}</span>
        <span className="logo__tag">Real Estate Consultants</span>
      </span>
    </Link>
  );
}
