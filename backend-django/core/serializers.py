from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import SiteSettings


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ['business_name', 'tagline', 'phone', 'whatsapp_number', 'email', 'address',
                  'office_hours', 'logo', 'social_links', 'updated_at']
        read_only_fields = ['updated_at']

    def validate_social_links(self, value):
        try:
            SiteSettings(social_links=value).clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict.get('social_links', exc.messages))
        return value
