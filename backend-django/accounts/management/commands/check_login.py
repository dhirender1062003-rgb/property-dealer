"""
Check whether a username/email and password would log in to the dashboard,
without changing anything.

    python manage.py check_login dhirendra

The password is typed into a hidden prompt and is never printed or stored.
"""
from getpass import getpass

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.management.base import BaseCommand, CommandError

from accounts.serializers import login_failure_reason, resolve_login


class Command(BaseCommand):
    help = 'Check a dashboard login (username or email + password) without changing anything.'

    def add_arguments(self, parser):
        parser.add_argument('login', help='Username or email')

    def handle(self, *args, **options):
        db = settings.DATABASES['default']
        self.stdout.write(f"Database: {db['ENGINE'].rsplit('.', 1)[-1]} {db['NAME']}")

        user = resolve_login(options['login'])
        if user is None:
            raise CommandError(f"No account found for {options['login']!r}.")
        self.stdout.write(f'Account:  {user.username} ({user.email}), role {user.role}, '
                          f'active {user.is_active}, dashboard access {user.is_management}')

        password = getpass('Password (hidden): ')
        if password != password.strip():
            self.stdout.write(self.style.WARNING('Note: this password starts or ends with a space.'))

        # The same check POST /api/auth/login/ makes (without updating last_login).
        if authenticate(username=user.username, password=password) is not None:
            if not user.is_management:
                raise CommandError('Password is correct, but this account has no dashboard access.')
            self.stdout.write(self.style.SUCCESS('OK: this login works. Use the same details on the dashboard.'))
            return
        raise CommandError(f'Login refused: {login_failure_reason(user, password)}.')
