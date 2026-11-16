from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from core.fields import IndianPhoneField
from inquiries.models import Inquiry
from properties.models import Property
from .models import Customer, SiteVisit


class CustomerSerializer(serializers.ModelSerializer):
    phone = IndianPhoneField(validators=[UniqueValidator(
        queryset=Customer.objects.all(), message='A customer with this phone number already exists.')])
    inquiry_count = serializers.IntegerField(read_only=True, default=0)
    visit_count = serializers.IntegerField(read_only=True, default=0)
    last_inquiry_at = serializers.DateTimeField(read_only=True, default=None)

    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'notes', 'inquiry_count', 'visit_count', 'last_inquiry_at',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def validate_name(self, value):
        value = ' '.join(value.split())
        if len(value) < 2:
            raise serializers.ValidationError('Please enter the customer name.')
        return value


class CustomerInquirySerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='property.title', read_only=True, default=None)
    inquiry_status_display = serializers.CharField(source='get_inquiry_status_display', read_only=True)
    inquiry_type_display = serializers.CharField(source='get_inquiry_type_display', read_only=True)

    class Meta:
        model = Inquiry
        fields = ['id', 'property', 'property_title', 'inquiry_type', 'inquiry_type_display', 'budget', 'message',
                  'inquiry_status', 'inquiry_status_display', 'follow_up_date', 'created_at']


class SiteVisitSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all(), required=False)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    property = serializers.PrimaryKeyRelatedField(queryset=Property.objects.all())
    property_title = serializers.CharField(source='property.title', read_only=True, default=None)
    property_slug = serializers.CharField(source='property.slug', read_only=True, default=None)
    property_location = serializers.SerializerMethodField()
    inquiry = serializers.PrimaryKeyRelatedField(queryset=Inquiry.objects.all(), required=False, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_username', read_only=True, default=None)

    class Meta:
        model = SiteVisit
        fields = ['id', 'customer', 'customer_name', 'customer_phone', 'property', 'property_title', 'property_slug',
                  'property_location', 'inquiry', 'scheduled_at', 'status', 'status_display', 'assigned_to',
                  'assigned_to_name', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_property_location(self, visit):
        prop = visit.property
        if not prop:
            return None
        return ', '.join(filter(None, [prop.locality.name if prop.locality_id else '', prop.city.name]))

    def validate_assigned_to(self, user):
        if user and not user.is_management:
            raise serializers.ValidationError('Visits can only be assigned to admins, dealers or staff.')
        return user

    def validate(self, attrs):
        inquiry = attrs.get('inquiry')
        customer = attrs.get('customer', getattr(self.instance, 'customer', None))
        if not customer and inquiry:
            customer = attrs['customer'] = inquiry.customer
        if not customer:
            raise serializers.ValidationError({'customer': 'Choose a customer (or a lead) for this visit.'})
        if inquiry and inquiry.customer_id and inquiry.customer_id != customer.id:
            raise serializers.ValidationError({'inquiry': 'This lead belongs to a different customer.'})

        scheduled_at = attrs.get('scheduled_at')
        status = attrs.get('status', getattr(self.instance, 'status', SiteVisit.Status.SCHEDULED))
        time_changed = scheduled_at and (not self.instance or scheduled_at != self.instance.scheduled_at)
        if time_changed and status == SiteVisit.Status.SCHEDULED and scheduled_at < timezone.now() - timedelta(minutes=5):
            raise serializers.ValidationError({'scheduled_at': 'Choose a date and time in the future.'})
        return attrs


class CustomerDetailSerializer(CustomerSerializer):
    inquiries = CustomerInquirySerializer(many=True, read_only=True)
    site_visits = SiteVisitSerializer(many=True, read_only=True)
    interested_properties = serializers.SerializerMethodField()

    class Meta(CustomerSerializer.Meta):
        fields = CustomerSerializer.Meta.fields + ['inquiries', 'site_visits', 'interested_properties']

    def get_interested_properties(self, customer):
        seen, result = set(), []
        sources = [i.property for i in customer.inquiries.all()] + [v.property for v in customer.site_visits.all()]
        for prop in sources:
            if prop and prop.id not in seen:
                seen.add(prop.id)
                result.append({'id': prop.id, 'title': prop.title, 'slug': prop.slug, 'status': prop.status,
                               'price': prop.price, 'listing_type': prop.listing_type})
        return result
