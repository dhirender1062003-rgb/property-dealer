from django.conf import settings
from django.db import models

from core.validators import validate_indian_phone


class Customer(models.Model):
    """
    A person who contacted the business. Created automatically from website
    enquiries (matched by phone number) or added by staff in the dashboard.
    """

    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=16, unique=True, validators=[validate_indian_phone],
                             help_text='10-digit mobile number; one customer record per number.')
    email = models.EmailField(blank=True)
    notes = models.TextField(blank=True, help_text='Private notes, never shown to the customer.')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['name'], name='customer_name_idx')]

    def __str__(self):
        return f'{self.name} ({self.phone})'


class SiteVisit(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'
        NO_SHOW = 'no_show', 'No Show'

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='site_visits')
    property = models.ForeignKey('properties.Property', on_delete=models.SET_NULL, null=True,
                                 related_name='site_visits')
    inquiry = models.ForeignKey('inquiries.Inquiry', on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='site_visits', help_text='The lead this visit came from.')
    scheduled_at = models.DateTimeField(db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='assigned_site_visits')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='+', editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_at']
        indexes = [models.Index(fields=['status', 'scheduled_at'], name='visit_status_time_idx')]

    def __str__(self):
        return f'{self.customer.name} - {self.scheduled_at:%d %b %Y %H:%M}'
