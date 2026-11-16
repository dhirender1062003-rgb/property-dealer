import { Link, useNavigate } from 'react-router-dom';
import {
  BellRing, Building2, CalendarClock, CircleCheck, Home, KeyRound, Plus, UserRound, Users,
} from 'lucide-react';
import { DataTable, PageHeader, Panel, StatCard, StatusBadge } from '../components';
import { formatDateTime } from '../format';
import { useApiGet } from '../hooks';
import { useAuth } from '../auth';
import { errorMessage } from '../adminApi';
import { ErrorState, Loader } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

function Breakdown({ title, data, labels }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  return (
    <div className="dash-breakdown">
      <h3>{title}</h3>
      <ul>
        {Object.entries(labels).map(([key, label]) => (
          <li key={key}>
            <span>{label}</span>
            <strong>{data[key] ?? 0}</strong>
            <span className="dash-breakdown__bar" aria-hidden="true">
              <span style={{ width: total ? `${((data[key] ?? 0) / total) * 100}%` : 0 }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OverviewPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApiGet('/dashboard/stats/');

  if (loading) return <Loader label="Loading dashboard…" />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={reload} />;

  const { properties: p, inquiries: i, site_visits: v, customers: c } = data;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.first_name || user.username}`}
        subtitle="Live overview of your properties, leads and site visits."
        actions={(
          <>
            <Link to="/dashboard/properties/new" className="btn btn--gold"><Plus size={18} /> Add Property</Link>
            <Link to="/dashboard/leads?new=1" className="btn btn--outline"><Plus size={18} /> Add Lead</Link>
          </>
        )}
      />

      <div className="dash-stats">
        <StatCard label="Total Properties" value={p.total} icon={Building2} to="/dashboard/properties" />
        <StatCard label="Available" value={p.available} icon={CircleCheck} tone="green" to="/dashboard/properties?status=available" />
        <StatCard label="Sold" value={p.sold} icon={Home} tone="navy" to="/dashboard/properties?status=sold" />
        <StatCard label="Rented / Leased" value={p.rented + p.leased} icon={KeyRound} tone="blue"
                  hint={`${p.rented} rented · ${p.leased} leased`} to="/dashboard/properties?status=rented" />
        <StatCard label="Total Inquiries" value={i.total} icon={Users} tone="navy" hint={`${i.last_30_days} in last 30 days`}
                  to="/dashboard/leads" />
        <StatCard label="New Leads" value={i.new} icon={BellRing} tone="gold" to="/dashboard/leads?inquiry_status=new" />
        <StatCard label="Scheduled Site Visits" value={v.scheduled} icon={CalendarClock} tone="gold"
                  hint={`${v.today} today`} to="/dashboard/site-visits" />
        <StatCard label="Follow-ups Due" value={i.follow_ups_due} icon={BellRing} tone={i.follow_ups_due ? 'red' : 'green'}
                  hint={`${c.total} customers`} to="/dashboard/leads?follow_up=overdue" />
      </div>

      <div className="dash-grid-2">
        <Panel title="Recent Leads" actions={<Link to="/dashboard/leads" className="link-btn">View all</Link>}>
          <DataTable
            rows={data.recent_inquiries}
            empty="No enquiries yet. They appear here when visitors use the website forms."
            onRowClick={(row) => navigate(`/dashboard/leads/${row.id}`)}
            columns={[
              { key: 'customer_name', label: 'Customer', render: (r) => <><strong>{r.customer_name}</strong><small className="dash-sub">{r.phone}</small></> },
              { key: 'property_title', label: 'Property', render: (r) => r.property_title || 'General enquiry' },
              { key: 'inquiry_status', label: 'Status', render: (r) => <StatusBadge value={r.inquiry_status} label={r.inquiry_status_display} /> },
              { key: 'created_at', label: 'Received', render: (r) => formatDateTime(r.created_at) },
            ]}
          />
        </Panel>

        <Panel title="Upcoming Site Visits" actions={<Link to="/dashboard/site-visits" className="link-btn">View all</Link>}>
          {data.upcoming_visits.length === 0 ? (
            <p className="dash-empty">No upcoming visits. Schedule one from a lead or customer.</p>
          ) : (
            <ul className="dash-visit-list">
              {data.upcoming_visits.map((visit) => (
                <li key={visit.id}>
                  <span className="dash-visit-list__date">
                    <CalendarClock size={18} /> {formatDateTime(visit.scheduled_at)}
                  </span>
                  <strong>{visit.customer_name}</strong> · {visit.customer_phone}
                  <small className="dash-sub">{visit.property_title || 'Property removed'}{visit.property_location ? ` — ${visit.property_location}` : ''}</small>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Property Portfolio">
        <div className="dash-breakdowns">
          <Breakdown title="By listing type" data={p.by_listing_type} labels={{ buy: 'For Sale', rent: 'For Rent', lease: 'For Lease' }} />
          <Breakdown title="By category" data={p.by_category} labels={{ residential: 'Residential', commercial: 'Commercial' }} />
          <Breakdown title="By status" data={{ available: p.available, sold: p.sold, rented: p.rented, leased: p.leased, draft: p.draft }}
                     labels={{ available: 'Available', sold: 'Sold', rented: 'Rented', leased: 'Leased', draft: 'Draft' }} />
        </div>
        <p className="dash-note"><UserRound size={16} /> {p.featured} properties are featured on the homepage.</p>
      </Panel>
    </>
  );
}
