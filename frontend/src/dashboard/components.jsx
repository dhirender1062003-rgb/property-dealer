import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle, Search, X } from 'lucide-react';
import { useDebounced } from './hooks';

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="dash-page-head">
      <div>
        {back && <Link to={back.to} className="dash-back">← {back.label}</Link>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="dash-page-head__actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'navy', to, hint }) {
  const body = (
    <>
      <span className={`dash-stat__icon dash-stat__icon--${tone}`}><Icon size={22} /></span>
      <span className="dash-stat__text">
        <span className="dash-stat__value">{value ?? '—'}</span>
        <span className="dash-stat__label">{label}</span>
        {hint && <span className="dash-stat__hint">{hint}</span>}
      </span>
    </>
  );
  return to ? <Link to={to} className="dash-stat">{body}</Link> : <div className="dash-stat">{body}</div>;
}

const TONES = {
  available: 'green', converted: 'green', completed: 'green',
  sold: 'navy', rented: 'navy', leased: 'navy', closed: 'navy',
  new: 'gold', scheduled: 'gold', site_visit: 'gold',
  contacted: 'blue', in_progress: 'blue',
  draft: 'gray', cancelled: 'gray',
  lost: 'red', spam: 'red', no_show: 'red', overdue: 'red',
};

export function StatusBadge({ value, label }) {
  return <span className={`dash-badge dash-badge--${TONES[value] ?? 'gray'}`}>{label ?? value}</span>;
}

export function Panel({ title, actions, children, className = '' }) {
  return (
    <section className={`dash-panel ${className}`}>
      {(title || actions) && (
        <div className="dash-panel__head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Responsive table. When its panel is too narrow (phone, tablet, half-width
 * panel), each row becomes a card with `label` shown next to each value.
 * columns: [{ key, label, render(row), className }]
 */
export function DataTable({ columns, rows, rowKey = 'id', onRowClick, empty = 'Nothing to show yet.' }) {
  if (!rows?.length) return <p className="dash-empty">{empty}</p>;
  // Tables with many columns switch to cards at a wider panel size.
  return (
    <div className={`dash-table-wrap ${columns.length >= 5 ? 'dash-table-wrap--wide' : ''}`}>
      <table className="dash-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.className}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]} className={onRowClick ? 'is-clickable' : ''}
                onClick={onRowClick ? (e) => !e.target.closest('a,button,select,input,label') && onRowClick(row) : undefined}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.label} className={c.className}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Field({ label, error, hint, children, className = '', required }) {
  return (
    <label className={`field ${error ? 'field--error' : ''} ${className}`}>
      <span className="field__label">{label}{required && ' *'}</span>
      {children}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}

export function SelectInput({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="dash-search">
      <Search size={18} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
             aria-label={placeholder} />
    </div>
  );
}

/**
 * Searchable picker backed by an API call.
 * value: { value, label } | null; load(query) → Promise<[{ value, label, sub }]>
 */
export function AsyncSelect({ value, onChange, load, placeholder = 'Type to search…', disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(query, 300);
  const listId = useId();
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setLoading(true);
    load(debounced)
      .then((opts) => active && setOptions(opts))
      .catch(() => active && setOptions([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, open]);

  useEffect(() => {
    const onDoc = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (value) {
    return (
      <div className="dash-async dash-async--chosen">
        <span>
          <strong>{value.label}</strong>
          {value.sub && <small>{value.sub}</small>}
        </span>
        {!disabled && (
          <button type="button" className="icon-btn" onClick={() => onChange(null)} aria-label="Clear selection">
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="dash-async" ref={boxRef}>
      <input
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
      />
      {open && (
        <ul className="dash-async__list" id={listId} role="listbox">
          {loading && <li className="dash-async__note"><LoaderCircle size={16} className="spin" /> Searching…</li>}
          {!loading && options.length === 0 && <li className="dash-async__note">No matches</li>}
          {!loading && options.map((o) => (
            <li key={o.value} role="option" aria-selected="false">
              <button type="button" onClick={() => { onChange(o); setOpen(false); setQuery(''); }}>
                <strong>{o.label}</strong>
                {o.sub && <small>{o.sub}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
