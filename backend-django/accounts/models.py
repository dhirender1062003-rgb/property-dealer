from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

from core.validators import validate_indian_phone


class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', CustomUser.Role.ADMIN)
        return super().create_superuser(username, email, password, **extra_fields)


class CustomUser(AbstractUser):
    """
    Site user. `role` decides what they can do:
    - admin / dealer / staff: manage properties and enquiries (and log in to Django admin)
    - customer: a normal website visitor account
    Passwords are hashed by Django (PBKDF2); they are never stored in plain text.
    """

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        DEALER = 'dealer', 'Dealer'
        STAFF = 'staff', 'Staff'
        CUSTOMER = 'customer', 'Customer'

    MANAGEMENT_ROLES = {Role.ADMIN, Role.DEALER, Role.STAFF}

    email = models.EmailField('email address', unique=True)
    phone = models.CharField(max_length=16, blank=True, validators=[validate_indian_phone])
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER, db_index=True)

    REQUIRED_FIELDS = ['email']

    objects = CustomUserManager()

    class Meta:
        verbose_name = 'user'
        verbose_name_plural = 'users'

    def __str__(self):
        return self.get_full_name() or self.username

    @property
    def is_management(self):
        """True for active admins, dealers and staff (and superusers)."""
        return self.is_active and (self.is_superuser or self.role in self.MANAGEMENT_ROLES)

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        if self.is_superuser and self.role == self.Role.CUSTOMER:
            self.role = self.Role.ADMIN
        # Management roles can sign in to Django admin; customers cannot.
        self.is_staff = self.is_superuser or self.role in self.MANAGEMENT_ROLES
        super().save(*args, **kwargs)
