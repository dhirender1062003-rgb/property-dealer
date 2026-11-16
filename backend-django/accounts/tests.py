import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase

User = get_user_model()


class AuthTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('ravi', 'ravi@example.com', 'S3cure-pass-123')

    def test_register_creates_customer_and_hashes_password(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'neha', 'email': 'Neha@Example.com', 'password': 'An0ther-Strong-pw',
            'phone': '+91 98765 43210', 'role': 'admin',  # role must be ignored
        })
        self.assertEqual(res.status_code, 201, res.data)
        user = User.objects.get(username='neha')
        self.assertEqual(user.role, 'customer')
        self.assertFalse(user.is_staff)
        self.assertEqual(user.email, 'neha@example.com')
        self.assertEqual(user.phone, '9876543210')
        self.assertNotEqual(user.password, 'An0ther-Strong-pw')
        self.assertTrue(user.check_password('An0ther-Strong-pw'))
        self.assertNotIn('password', res.data)

    def test_register_rejects_duplicate_email_and_weak_password(self):
        res = self.client.post('/api/auth/register/', {'username': 'x', 'email': 'RAVI@example.com', 'password': 'S3cure-pass-xyz'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.data)
        res = self.client.post('/api/auth/register/', {'username': 'y', 'email': 'y@example.com', 'password': '12345678'})
        self.assertEqual(res.status_code, 400)

    def test_login_with_username_or_email_returns_tokens_with_role(self):
        for login in ('ravi', 'RAVI@example.com'):
            res = self.client.post('/api/auth/login/', {'username': login, 'password': 'S3cure-pass-123'})
            self.assertEqual(res.status_code, 200, res.data)
            self.assertIn('access', res.data)
            self.assertIn('refresh', res.data)
            self.assertEqual(res.data['user']['role'], 'customer')
        claims = jwt.decode(res.data['access'], settings.SIMPLE_JWT['SIGNING_KEY'], algorithms=['HS256'])
        self.assertEqual(claims['role'], 'customer')
        self.assertEqual(claims['username'], 'ravi')

    def test_login_username_is_case_insensitive_and_prefers_exact_match(self):
        res = self.client.post('/api/auth/login/', {'username': ' Ravi ', 'password': 'S3cure-pass-123'})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['user']['username'], 'ravi')
        User.objects.create_user('Ravi', 'ravi2@example.com', 'Other-pass-456')
        res = self.client.post('/api/auth/login/', {'username': 'Ravi', 'password': 'Other-pass-456'})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['user']['username'], 'Ravi')

    def test_superuser_from_createsuperuser_can_log_in_to_dashboard(self):
        User.objects.create_superuser('boss', 'boss@example.com', 'Boss-pass-789')
        res = self.client.post('/api/auth/login/', {'username': 'boss@example.com', 'password': 'Boss-pass-789'})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data['user']['is_management'])
        self.assertEqual(res.data['user']['role'], 'admin')

    def test_login_keeps_password_exactly_as_typed(self):
        # createsuperuser / changepassword store spaces at the ends of a password;
        # the login API must not strip them, or the correct password is rejected.
        User.objects.create_superuser('spacey', 'spacey@example.com', ' Edge-space-pass-1 ')
        res = self.client.post('/api/auth/login/', {'username': 'spacey', 'password': ' Edge-space-pass-1 '}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        res = self.client.post('/api/auth/login/', {'username': 'spacey', 'password': 'Edge-space-pass-1'}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_refused_login_is_logged_with_reason_but_not_password(self):
        with self.assertLogs('accounts.auth', 'WARNING') as logs:
            self.client.post('/api/auth/login/', {'username': 'ravi', 'password': 'Wrong-secret-99'})
            self.client.post('/api/auth/login/', {'username': 'nobody', 'password': 'x'})
        self.assertIn("'ravi': wrong password", logs.output[0])
        self.assertIn('no account', logs.output[1])
        self.assertNotIn('Wrong-secret-99', ''.join(logs.output))

    def test_check_login_command(self):
        from unittest import mock
        from django.core.management import CommandError, call_command
        from io import StringIO
        before = User.objects.get(username='ravi').last_login
        out = StringIO()
        with mock.patch('accounts.management.commands.check_login.getpass', return_value='S3cure-pass-123'):
            with self.assertRaisesMessage(CommandError, 'no dashboard access'):  # ravi is a customer
                call_command('check_login', 'RAVI@example.com', stdout=out)
        User.objects.create_superuser('boss2', 'boss2@example.com', 'Boss-pass-789')
        with mock.patch('accounts.management.commands.check_login.getpass', return_value='Boss-pass-789'):
            call_command('check_login', 'Boss2', stdout=out)
        self.assertIn('OK: this login works', out.getvalue())
        with mock.patch('accounts.management.commands.check_login.getpass', return_value='nope'):
            with self.assertRaisesMessage(CommandError, 'wrong password'):
                call_command('check_login', 'boss2', stdout=out)
        self.assertEqual(User.objects.get(username='ravi').last_login, before)  # changes nothing

    def test_login_wrong_password(self):
        res = self.client.post('/api/auth/login/', {'username': 'ravi', 'password': 'wrong'})
        self.assertEqual(res.status_code, 401)

    def test_refresh_and_me(self):
        tokens = self.client.post('/api/auth/login/', {'username': 'ravi', 'password': 'S3cure-pass-123'}).data
        res = self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']})
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)

        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {res.data["access"]}')
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['username'], 'ravi')


class RoleTests(APITestCase):
    def test_roles_set_admin_access_and_groups(self):
        boss = User.objects.create_superuser('boss', 'boss@example.com', 'S3cure-pass-123')
        self.assertEqual(boss.role, 'admin')
        self.assertTrue(boss.groups.filter(name='Admin').exists())

        staff = User.objects.create_user('sam', 'sam@example.com', 'S3cure-pass-123', role='staff')
        self.assertTrue(staff.is_staff)
        self.assertTrue(staff.is_management)
        self.assertTrue(staff.has_perm('properties.add_property'))
        self.assertFalse(staff.has_perm('properties.delete_property'))

        staff.role = 'customer'
        staff.save()
        staff = User.objects.get(pk=staff.pk)  # reload permission cache
        self.assertFalse(staff.is_staff)
        self.assertFalse(staff.groups.exists())
        self.assertFalse(staff.has_perm('properties.add_property'))
