from django.conf import settings
from django.db import models

from core.validators import validate_indian_phone


class Inquiry(models.Model):
    class InquiryType(models.TextChoices):
        BUY = 'buy', 'Wants to buy'
        RENT = 'rent', 'Wants to rent'
        LEASE = 'lease', 'Wants to lease'
        SELL = 'sell', 'Wants to sell a property'
        RENT_OUT = 'rent_out', 'Wants to rent out / lease out'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        NEW = 'new', 'New'
        CONTACTED = 'contacted', 'Contacted'
        IN_PROGRESS = 'in_progress', 'In Progress'
        SITE_VISIT = 'site_visit', 'Site Visit Scheduled'
        CONVERTED = 'converted', 'Converted (Deal Done)'
        CLOSED = 'closed', 'Closed'
        LOST = 'lost', 'Lost'
        SPAM = 'spam', 'Spam'

    # Leads in these states need no more follow-up.
    FINISHED_STATUSES = (Status.CONVERTED, Status.CLOSED, Status.LOST, Status.SPAM)

    customer = models.ForeignKey('crm.Customer', on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name='inquiries')
    customer_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=16, validators=[validate_indian_phone])
    email = models.EmailField(blank=True)
    property = models.ForeignKey('properties.Property', on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name='inquiries', help_text='The property the customer asked about.')
    inquiry_type = models.CharField(max_length=20, choices=InquiryType.choices, default=InquiryType.BUY)
    preferred_city = models.ForeignKey('properties.City', on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='+')
    budget = models.CharField(max_length=60, blank=True)
    message = models.TextField(max_length=2000)

    inquiry_status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW, db_index=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='assigned_inquiries', limit_choices_to={'is_staff': True})
    admin_notes = models.TextField(blank=True, help_text='Private notes, never shown to the customer.')
    follow_up_date = models.DateField(null=True, blank=True, db_index=True)

    source_page = models.CharField(max_length=300, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True, editable=False)
    user_agent = models.CharField(max_length=300, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'inquiries'
        indexes = [models.Index(fields=['phone', 'created_at'], name='inquiry_phone_created_idx')]

    def __str__(self):
        return f'{self.customer_name} ({self.phone})'
