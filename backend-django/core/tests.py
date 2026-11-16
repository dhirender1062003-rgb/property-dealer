from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import SiteSettings

User = get_user_model()


class SiteSettingsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('admin1', 'a@example.com', 'S3cure-pass-123', role='admin')
        self.staff = User.objects.create_user('staff1', 's@example.com', 'S3cure-pass-123', role='staff')

    def test_public_can_read(self):
        res = self.client.get('/api/site-settings/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['business_name'], 'Property Dealer')
        self.assertIn('whatsapp_number', res.data)

    def test_only_admin_can_update(self):
        payload = {'phone': '9876543210', 'whatsapp_number': '919876543210', 'office_hours': '10 AM - 7 PM'}
        self.assertEqual(self.client.patch('/api/site-settings/', payload).status_code, 401)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.patch('/api/site-settings/', payload).status_code, 403)
        self.client.force_authenticate(self.admin)
        res = self.client.patch('/api/site-settings/', payload)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(SiteSettings.load().phone, '9876543210')
        self.assertEqual(SiteSettings.objects.count(), 1)

    def test_validation(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch('/api/site-settings/', {'whatsapp_number': 'call me'})
        self.assertEqual(res.status_code, 400)
        res = self.client.patch('/api/site-settings/', {'social_links': {'facebook': 'not a url'}}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.client.patch('/api/site-settings/', {'social_links': {'instagram': 'https://instagram.com/pd'}},
                                format='json')
        self.assertEqual(res.status_code, 200, res.data)

    def test_health(self):
        self.assertEqual(self.client.get('/api/health/').json()['status'], 'ok')
