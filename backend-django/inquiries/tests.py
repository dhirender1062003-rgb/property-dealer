from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from properties.models import City, Property
from .models import Inquiry

User = get_user_model()


class InquiryApiTests(APITestCase):
    def setUp(self):
        cache.clear()  # reset rate limits between tests
        self.city = City.objects.get(slug='noida')
        self.prop = Property.objects.create(title='Office', property_type='office', listing_type='rent',
                                            price=50000, area=1000, city=self.city)
        self.staff = User.objects.create_user('staff1', 's@example.com', 'S3cure-pass-123', role='staff')
        self.admin = User.objects.create_user('admin1', 'a@example.com', 'S3cure-pass-123', role='admin')
        self.customer = User.objects.create_user('cust1', 'c@example.com', 'S3cure-pass-123')

    def payload(self, **extra):
        return {'customer_name': 'Amit Sharma', 'phone': '+91 98765 43210', 'email': 'amit@example.com',
                'property': self.prop.id, 'inquiry_type': 'rent', 'preferred_city': 'noida',
                'budget': '50,000/month', 'message': 'Please share more details about this office.', **extra}

    def test_public_submit_saves_enquiry(self):
        res = self.client.post('/api/inquiries/', self.payload())
        self.assertEqual(res.status_code, 201, res.data)
        inquiry = Inquiry.objects.get(pk=res.data['id'])
        self.assertEqual(inquiry.phone, '9876543210')
        self.assertEqual(inquiry.property, self.prop)
        self.assertEqual(inquiry.preferred_city, self.city)
        self.assertEqual(inquiry.inquiry_status, 'new')
        self.assertEqual(inquiry.ip_address, '127.0.0.1')
        # Nothing private is echoed back.
        self.assertEqual(set(res.data), {'id', 'detail'})

    def test_validation_errors(self):
        cases = {
            'phone': {'phone': '12345'},
            'customer_name': {'customer_name': ' '},
            'email': {'email': 'not-an-email'},
            'message': {'message': 'hi'},
            'preferred_city': {'preferred_city': 'mumbai'},
        }
        for field, bad in cases.items():
            with self.subTest(field=field):
                res = self.client.post('/api/inquiries/', self.payload(**bad))
                self.assertEqual(res.status_code, 400)
                self.assertIn(field, res.data)
        self.assertEqual(Inquiry.objects.count(), 0)

    def test_email_and_property_are_optional(self):
        res = self.client.post('/api/inquiries/', self.payload(email='', property=''))
        self.assertEqual(res.status_code, 201, res.data)

    def test_spam_protection(self):
        res = self.client.post('/api/inquiries/', self.payload(website='http://spam.example'))
        self.assertEqual(res.status_code, 400)
        res = self.client.post('/api/inquiries/', self.payload(
            message='Buy now http://a.example http://b.example http://c.example'))
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Inquiry.objects.count(), 0)

        self.assertEqual(self.client.post('/api/inquiries/', self.payload()).status_code, 201)
        res = self.client.post('/api/inquiries/', self.payload())  # exact duplicate
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Inquiry.objects.count(), 1)

    def test_rate_limit(self):
        with mock.patch.dict(ScopedRateThrottle.THROTTLE_RATES, {'inquiries': '3/hour'}):
            codes = [self.client.post('/api/inquiries/', self.payload(message=f'Enquiry number {i} please call')).status_code
                     for i in range(4)]
        self.assertEqual(codes, [201, 201, 201, 429])

    def test_enquiries_are_private(self):
        self.client.post('/api/inquiries/', self.payload())
        self.assertEqual(self.client.get('/api/inquiries/').status_code, 401)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get('/api/inquiries/').status_code, 403)
        self.client.force_authenticate(self.staff)
        res = self.client.get('/api/inquiries/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['results'][0]['phone'], '9876543210')
        self.assertEqual(res.data['results'][0]['property_title'], 'Office')

    def test_staff_update_workflow_only_and_admin_delete(self):
        inquiry_id = self.client.post('/api/inquiries/', self.payload()).data['id']
        url = f'/api/inquiries/{inquiry_id}/'
        self.client.force_authenticate(self.staff)
        res = self.client.patch(url, {'inquiry_status': 'contacted', 'admin_notes': 'Called', 'message': 'changed!'})
        self.assertEqual(res.status_code, 200, res.data)
        inquiry = Inquiry.objects.get(pk=inquiry_id)
        self.assertEqual(inquiry.inquiry_status, 'contacted')
        self.assertEqual(inquiry.message, 'Please share more details about this office.')
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(url).status_code, 204)
