from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from inquiries.models import Inquiry
from properties.models import City, Locality, Property
from .models import Customer, SiteVisit

User = get_user_model()


class CrmTestBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.noida = City.objects.get(slug='noida')
        self.prop = Property.objects.create(title='Office in Sector 62', property_type='office', listing_type='rent',
                                            price=90000, area=1500, city=self.noida)
        self.sold = Property.objects.create(title='Sold Flat', property_type='flat', listing_type='buy',
                                            price=5000000, area=900, city=self.noida, status='sold')
        self.admin = User.objects.create_user('admin1', 'a@example.com', 'S3cure-pass-123', role='admin')
        self.dealer = User.objects.create_user('dealer1', 'd@example.com', 'S3cure-pass-123', role='dealer')
        self.staff = User.objects.create_user('staff1', 's@example.com', 'S3cure-pass-123', role='staff')
        self.customer_user = User.objects.create_user('cust1', 'c@example.com', 'S3cure-pass-123')

    def submit_enquiry(self, phone='9876543210', message='Please call me about this office.', **extra):
        return self.client.post('/api/inquiries/', {'customer_name': 'Amit Sharma', 'phone': phone,
                                                    'message': message, 'property': self.prop.id, **extra})


class CustomerTests(CrmTestBase):
    def test_enquiries_create_and_reuse_customer_by_phone(self):
        self.assertEqual(self.submit_enquiry(email='amit@example.com').status_code, 201)
        self.assertEqual(self.submit_enquiry(phone='+91 98765 43210', message='Also interested in shops.').status_code, 201)
        self.assertEqual(Customer.objects.count(), 1)
        customer = Customer.objects.get()
        self.assertEqual((customer.name, customer.phone, customer.email), ('Amit Sharma', '9876543210', 'amit@example.com'))
        self.assertEqual(customer.inquiries.count(), 2)

    def test_customer_api_is_private(self):
        self.submit_enquiry()
        self.assertEqual(self.client.get('/api/customers/').status_code, 401)
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.client.get('/api/customers/').status_code, 403)
        self.client.force_authenticate(self.staff)
        res = self.client.get('/api/customers/?search=amit')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['results'][0]['inquiry_count'], 1)

    def test_customer_detail_history_and_crud(self):
        self.submit_enquiry()
        customer = Customer.objects.get()
        SiteVisit.objects.create(customer=customer, property=self.sold, scheduled_at=timezone.now() + timedelta(days=1))
        self.client.force_authenticate(self.staff)
        res = self.client.get(f'/api/customers/{customer.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['inquiries']), 1)
        self.assertEqual(len(res.data['site_visits']), 1)
        self.assertCountEqual([p['id'] for p in res.data['interested_properties']], [self.prop.id, self.sold.id])

        res = self.client.post('/api/customers/', {'name': 'Neha', 'phone': '9812345678', 'email': 'n@example.com'})
        self.assertEqual(res.status_code, 201, res.data)
        res = self.client.post('/api/customers/', {'name': 'Dup', 'phone': '+91 98123 45678'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('phone', res.data)
        new_id = Customer.objects.get(phone='9812345678').id
        self.assertEqual(self.client.patch(f'/api/customers/{new_id}/', {'notes': 'Wants a corner shop'}).status_code, 200)
        self.assertEqual(self.client.delete(f'/api/customers/{new_id}/').status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(f'/api/customers/{new_id}/').status_code, 204)


class SiteVisitTests(CrmTestBase):
    def test_schedule_from_lead_moves_lead_forward(self):
        inquiry_id = self.submit_enquiry().data['id']
        when = (timezone.now() + timedelta(days=2)).isoformat()
        self.client.force_authenticate(self.staff)
        res = self.client.post('/api/site-visits/', {'inquiry': inquiry_id, 'property': self.prop.id,
                                                     'scheduled_at': when, 'assigned_to': self.staff.id})
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['customer_name'], 'Amit Sharma')
        self.assertEqual(res.data['property_location'], 'Noida')
        self.assertEqual(Inquiry.objects.get(pk=inquiry_id).inquiry_status, 'site_visit')

    def test_validation(self):
        self.submit_enquiry()
        customer = Customer.objects.get()
        other = Customer.objects.create(name='Other', phone='9811111111')
        inquiry = Inquiry.objects.get()
        self.client.force_authenticate(self.staff)
        past = (timezone.now() - timedelta(days=1)).isoformat()
        future = (timezone.now() + timedelta(days=1)).isoformat()
        res = self.client.post('/api/site-visits/', {'customer': customer.id, 'property': self.prop.id, 'scheduled_at': past})
        self.assertEqual(res.status_code, 400)
        self.assertIn('scheduled_at', res.data)
        res = self.client.post('/api/site-visits/', {'property': self.prop.id, 'scheduled_at': future})
        self.assertIn('customer', res.data)
        res = self.client.post('/api/site-visits/', {'customer': other.id, 'inquiry': inquiry.id,
                                                     'property': self.prop.id, 'scheduled_at': future})
        self.assertIn('inquiry', res.data)
        res = self.client.post('/api/site-visits/', {'customer': customer.id, 'property': self.prop.id,
                                                     'scheduled_at': future, 'assigned_to': self.customer_user.id})
        self.assertIn('assigned_to', res.data)

    def test_status_update_filters_and_permissions(self):
        customer = Customer.objects.create(name='Ravi', phone='9822222222')
        today_visit = SiteVisit.objects.create(customer=customer, property=self.prop,
                                               scheduled_at=timezone.now() + timedelta(minutes=30))
        SiteVisit.objects.create(customer=customer, property=self.prop, scheduled_at=timezone.now() + timedelta(days=5))
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.client.get('/api/site-visits/').status_code, 403)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get('/api/site-visits/?when=upcoming').data['count'], 2)
        res = self.client.patch(f'/api/site-visits/{today_visit.id}/', {'status': 'completed', 'notes': 'Liked it'})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self.client.get('/api/site-visits/?status=completed').data['count'], 1)
        self.assertEqual(self.client.delete(f'/api/site-visits/{today_visit.id}/').status_code, 403)
        self.client.force_authenticate(self.dealer)
        self.assertEqual(self.client.delete(f'/api/site-visits/{today_visit.id}/').status_code, 204)


class LeadTests(CrmTestBase):
    def test_staff_adds_lead_and_sets_follow_up(self):
        self.client.force_authenticate(self.staff)
        tomorrow = (timezone.localdate() + timedelta(days=1)).isoformat()
        res = self.client.post('/api/inquiries/', {
            'customer_name': 'Walk-in Customer', 'phone': '9833333333', 'message': 'Wants 2 BHK',
            'inquiry_type': 'buy', 'budget': '₹50 Lac - ₹1 Cr', 'follow_up_date': tomorrow,
            'admin_notes': 'Came to office', 'assigned_to': self.staff.id,
        })
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['follow_up_date'], tomorrow)
        self.assertEqual(res.data['customer'], Customer.objects.get(phone='9833333333').id)
        lead_id = res.data['id']
        yesterday = (timezone.localdate() - timedelta(days=1)).isoformat()
        self.assertEqual(self.client.patch(f'/api/inquiries/{lead_id}/', {'follow_up_date': yesterday}).status_code, 200)
        self.assertEqual(self.client.get('/api/inquiries/?follow_up=overdue').data['count'], 1)
        self.client.patch(f'/api/inquiries/{lead_id}/', {'inquiry_status': 'converted'})
        self.assertEqual(self.client.get('/api/inquiries/?follow_up=overdue').data['count'], 0)


class DashboardStatsTests(CrmTestBase):
    def test_stats_use_real_data_and_are_private(self):
        self.submit_enquiry()
        customer = Customer.objects.get()
        SiteVisit.objects.create(customer=customer, property=self.prop, scheduled_at=timezone.now() + timedelta(days=1))
        self.assertEqual(self.client.get('/api/dashboard/stats/').status_code, 401)
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.client.get('/api/dashboard/stats/').status_code, 403)
        self.client.force_authenticate(self.staff)
        data = self.client.get('/api/dashboard/stats/').data
        self.assertEqual(data['properties']['total'], 2)
        self.assertEqual(data['properties']['available'], 1)
        self.assertEqual(data['properties']['sold'], 1)
        self.assertEqual(data['properties']['by_type'], {'office': 1, 'flat': 1})
        self.assertEqual(data['inquiries']['total'], 1)
        self.assertEqual(data['inquiries']['new'], 1)
        self.assertEqual(data['site_visits']['scheduled'], 1)
        self.assertEqual(data['customers']['total'], 1)
        self.assertEqual(len(data['recent_inquiries']), 1)
        self.assertEqual(len(data['upcoming_visits']), 1)


class LocationManagementTests(CrmTestBase):
    def test_admin_and_dealer_manage_locations_staff_cannot(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post('/api/localities/', {'city': 'noida', 'name': 'Sector 168'}).status_code, 403)
        self.client.force_authenticate(self.dealer)
        res = self.client.post('/api/localities/', {'city': 'noida', 'name': 'Sector 168'})
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['slug'], 'sector-168')
        dup = self.client.post('/api/localities/', {'city': 'noida', 'name': 'Sector 168'})
        self.assertEqual(dup.status_code, 400)
        loc_id = res.data['id']
        self.assertEqual(self.client.patch(f'/api/localities/{loc_id}/', {'is_active': False}).status_code, 200)

        # Hidden localities: staff see them, the public does not.
        self.client.force_authenticate(None)
        public = self.client.get('/api/localities/?city=noida').data
        self.assertNotIn('sector-168', [l['slug'] for l in public])
        self.client.force_authenticate(self.staff)
        self.assertIn('sector-168', [l['slug'] for l in self.client.get('/api/localities/?city=noida').data])

        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/cities/', {'name': 'Faridabad', 'state': 'Haryana'})
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(self.client.patch('/api/cities/faridabad/', {'display_order': 9}).status_code, 200)
        self.assertEqual(self.client.delete('/api/cities/faridabad/').status_code, 204)
        res = self.client.delete('/api/cities/noida/')  # has properties
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Locality.objects.filter(slug='sector-62').exists())

    def test_team_list(self):
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.client.get('/api/team/').status_code, 403)
        self.client.force_authenticate(self.staff)
        names = [u['username'] for u in self.client.get('/api/team/').data]
        self.assertCountEqual(names, ['admin1', 'dealer1', 'staff1'])
