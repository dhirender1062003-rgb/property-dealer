import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SiteSettingsProvider } from './context/SiteSettingsContext';
import { TaxonomyProvider } from './context/TaxonomyContext';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SiteSettingsProvider>
        <TaxonomyProvider>
          <App />
        </TaxonomyProvider>
      </SiteSettingsProvider>
    </BrowserRouter>
  </StrictMode>,
);
