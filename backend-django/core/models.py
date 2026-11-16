from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import models

from .validators import (
    validate_image_extension, validate_image_size, validate_indian_phone, validate_whatsapp_number,
)

SOCIAL_NETWORKS = ['facebook', 'instagram', 'youtube', 'linkedin', 'x', 'twitter']


class SiteSettings(models.Model):
    """
    Website-wide contact details, edited in Django admin.
    There is only ever one row (pk=1); use SiteSettings.load().
    """

    business_name = models.CharField(max_length=120, default='Property Dealer')
    tagline = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True, validators=[validate_indian_phone],
                             help_text='Shown on the website and used for Call buttons.')
    whatsapp_number = models.CharField(max_length=16, blank=True, validators=[validate_whatsapp_number],
                                       help_text='With country code, digits only, e.g. 919876543210.')
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=300, blank=True)
    office_hours = models.CharField(max_length=120, blank=True, help_text='e.g. Mon - Sun: 10:00 AM - 7:00 PM')
    logo = models.ImageField(upload_to='site/', blank=True, validators=[validate_image_extension, validate_image_size])
    social_links = models.JSONField(
        default=dict, blank=True,
        help_text='Example: {"facebook": "https://facebook.com/yourpage", "instagram": "https://instagram.com/you"}',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Site settings'
        verbose_name_plural = 'Site settings'

    def __str__(self):
        return 'Website contact details'

    def clean(self):
        if not isinstance(self.social_links, dict):
            raise ValidationError({'social_links': 'Must be a JSON object like {"facebook": "https://..."}.'})
        check_url = URLValidator(schemes=['http', 'https'])
        for name, url in self.social_links.items():
            if name not in SOCIAL_NETWORKS:
                raise ValidationError({'social_links': f'Unknown network "{name}". Use: {", ".join(SOCIAL_NETWORKS)}.'})
            try:
                check_url(url)
            except ValidationError:
                raise ValidationError({'social_links': f'"{url}" is not a valid link for {name}.'})

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # The settings row is required by the website; it cannot be deleted.
        return (0, {})

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
