import re
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from core.fields import IndianPhoneField
from crm.services import get_or_create_customer
from properties.models import City, Property
from .models import Inquiry

URL_PATTERN = re.compile(r'https?://|www\.', re.IGNORECASE)
MAX_LINKS = 2
DUPLICATE_WINDOW = timedelta(minutes=10)


class LinkCustomerMixin:
    """Every new enquiry is attached to the customer with the same phone number."""

    def create(self, validated_data):
        validated_data['customer'] = get_or_create_customer(
            validated_data['customer_name'], validated_data['phone'], validated_data.get('email', ''),
        )
        return super().create(validated_data)


def validate_assignee(user):
    if user and not user.is_management:
        raise serializers.ValidationError('Leads can only be assigned to admins, dealers or staff.')
    return user


class InquiryCreateSerializer(LinkCustomerMixin, serializers.ModelSerializer):
    """Public enquiry form. Anyone can submit; nothing private is returned."""

    property = serializers.PrimaryKeyRelatedField(
        queryset=Property.objects.exclude(status=Property.Status.DRAFT), required=False, allow_null=True,
    )
    preferred_city = serializers.SlugRelatedField(
        slug_field='slug', queryset=City.objects.filter(is_active=True), required=False, allow_null=True,
    )
    phone = IndianPhoneField(error_messages={'blank': 'Please enter your mobile number.'})
    # Honeypot: hidden from people by the frontend. Bots that fill it are rejected.
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Inquiry
        fields = ['id', 'customer_name', 'phone', 'email', 'property', 'inquiry_type', 'preferred_city',
                  'budget', 'message', 'source_page', 'website', 'created_at']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'customer_name': {'error_messages': {'blank': 'Please enter your name.', 'required': 'Please enter your name.'}},
            'message': {'error_messages': {'blank': 'Please write a message.', 'required': 'Please write a message.'}},
        }

    def validate_customer_name(self, value):
        value = ' '.join(value.split())
        if len(value) < 2:
            raise serializers.ValidationError('Please enter your name.')
        return value

    def validate_message(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError('Please write a short message (at least 10 characters).')
        if len(URL_PATTERN.findall(value)) > MAX_LINKS:
            raise serializers.ValidationError('Please remove the links from your message.')
        return value

    def validate(self, attrs):
        if attrs.pop('website', ''):
            raise serializers.ValidationError('Your enquiry could not be accepted.')
        recent = Inquiry.objects.filter(
            phone=attrs['phone'], message=attrs['message'], created_at__gte=timezone.now() - DUPLICATE_WINDOW,
        )
        if recent.exists():
            raise serializers.ValidationError('We have already received this enquiry. Our team will contact you soon.')
        return attrs


class InquirySerializer(serializers.ModelSerializer):
    """Full lead details for staff. Only the follow-up fields can be changed."""

    property_title = serializers.CharField(source='property.title', read_only=True, default=None)
    property_slug = serializers.CharField(source='property.slug', read_only=True, default=None)
    preferred_city = serializers.SlugRelatedField(slug_field='slug', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_username', read_only=True, default=None)
    inquiry_type_display = serializers.CharField(source='get_inquiry_type_display', read_only=True)
    inquiry_status_display = serializers.CharField(source='get_inquiry_status_display', read_only=True)

    class Meta:
        model = Inquiry
        fields = [
            'id', 'customer', 'customer_name', 'phone', 'email', 'property', 'property_title', 'property_slug',
            'inquiry_type', 'inquiry_type_display', 'preferred_city', 'budget', 'message',
            'inquiry_status', 'inquiry_status_display', 'follow_up_date',
            'assigned_to', 'assigned_to_name', 'admin_notes', 'source_page', 'ip_address',
            'created_at', 'updated_at',
        ]
        # Staff can only change workflow fields, never what the customer wrote.
        read_only_fields = [f for f in fields
                            if f not in ('inquiry_status', 'follow_up_date', 'assigned_to', 'admin_notes')]

    def validate_assigned_to(self, user):
        return validate_assignee(user)


class LeadCreateSerializer(LinkCustomerMixin, serializers.ModelSerializer):
    """Staff adding a lead by hand (phone call, walk-in) from the dashboard."""

    phone = IndianPhoneField()
    property = serializers.PrimaryKeyRelatedField(queryset=Property.objects.all(), required=False, allow_null=True)
    preferred_city = serializers.SlugRelatedField(slug_field='slug', queryset=City.objects.all(),
                                                  required=False, allow_null=True)

    class Meta:
        model = Inquiry
        fields = ['customer_name', 'phone', 'email', 'property', 'inquiry_type', 'preferred_city', 'budget',
                  'message', 'inquiry_status', 'follow_up_date', 'assigned_to', 'admin_notes']

    def validate_customer_name(self, value):
        value = ' '.join(value.split())
        if len(value) < 2:
            raise serializers.ValidationError('Please enter the customer name.')
        return value

    def validate_assigned_to(self, user):
        return validate_assignee(user)

    def create(self, validated_data):
        validated_data['source_page'] = 'dashboard'
        return super().create(validated_data)

    def to_representation(self, instance):
        return InquirySerializer(instance, context=self.context).data
