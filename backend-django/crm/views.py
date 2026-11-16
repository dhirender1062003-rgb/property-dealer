from datetime import timedelta

import django_filters
from django.db.models import Count, Max, Prefetch
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrDealer, IsAdminRole, IsManagement
from inquiries.models import Inquiry
from properties.models import Property
from .models import Customer, SiteVisit
from .serializers import CustomerDetailSerializer, CustomerSerializer, SiteVisitSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    """
    /api/customers/        list (search: name, phone, email) / create
    /api/customers/<id>/   details with enquiry history, site visits, interested properties
    Admin, dealer and staff only. Delete: admin only.
    """

    search_fields = ['name', 'phone', 'email']
    ordering_fields = ['created_at', 'name', 'last_inquiry_at']
    ordering = ['-created_at']

    def get_permissions(self):
        return [IsAdminRole()] if self.action == 'destroy' else [IsManagement()]

    def get_queryset(self):
        qs = Customer.objects.annotate(
            inquiry_count=Count('inquiries', distinct=True),
            visit_count=Count('site_visits', distinct=True),
            last_inquiry_at=Max('inquiries__created_at'),
        )
        if self.action == 'retrieve':
            qs = qs.prefetch_related(
                Prefetch('inquiries', queryset=Inquiry.objects.select_related('property').order_by('-created_at')),
                Prefetch('site_visits', queryset=SiteVisit.objects.select_related(
                    'property__city', 'property__locality', 'assigned_to').order_by('-scheduled_at')),
            )
        return qs

    def get_serializer_class(self):
        return CustomerDetailSerializer if self.action == 'retrieve' else CustomerSerializer


class SiteVisitFilter(django_filters.FilterSet):
    WHEN_CHOICES = [('upcoming', 'Upcoming'), ('today', 'Today'), ('past', 'Past')]
    when = django_filters.ChoiceFilter(choices=WHEN_CHOICES, method='filter_when')
    date = django_filters.DateFilter(field_name='scheduled_at', lookup_expr='date')

    class Meta:
        model = SiteVisit
        fields = ['status', 'customer', 'property', 'inquiry', 'assigned_to']

    def filter_when(self, queryset, name, value):
        now = timezone.now()
        if value == 'today':
            return queryset.filter(scheduled_at__date=timezone.localdate())
        if value == 'past':
            return queryset.filter(scheduled_at__lt=now)
        return queryset.filter(scheduled_at__gte=now)


class SiteVisitViewSet(viewsets.ModelViewSet):
    """
    /api/site-visits/        list / schedule a visit
    /api/site-visits/<id>/   view / reschedule / change status
    Admin, dealer and staff. Delete: admin and dealer.
    """

    filterset_class = SiteVisitFilter
    search_fields = ['customer__name', 'customer__phone', 'property__title']
    ordering_fields = ['scheduled_at', 'created_at', 'status']
    ordering = ['scheduled_at']
    serializer_class = SiteVisitSerializer

    def get_permissions(self):
        return [IsAdminOrDealer()] if self.action == 'destroy' else [IsManagement()]

    def get_queryset(self):
        return SiteVisit.objects.select_related('customer', 'property__city', 'property__locality', 'assigned_to')

    def perform_create(self, serializer):
        visit = serializer.save(created_by=self.request.user)
        # Move the related lead forward in the pipeline.
        inquiry = visit.inquiry
        if inquiry and inquiry.inquiry_status in (Inquiry.Status.NEW, Inquiry.Status.CONTACTED,
                                                  Inquiry.Status.IN_PROGRESS):
            inquiry.inquiry_status = Inquiry.Status.SITE_VISIT
            inquiry.save(update_fields=['inquiry_status', 'updated_at'])


def counts_by(queryset, field):
    return {row[field]: row['n'] for row in queryset.values(field).annotate(n=Count('id')).order_by()}


class DashboardStatsView(APIView):
    """GET /api/dashboard/stats/ — live numbers for the dashboard overview."""

    permission_classes = [IsManagement]

    def get(self, request):
        now = timezone.now()
        today = timezone.localdate()
        properties = Property.objects.all()
        inquiries = Inquiry.objects.all()
        visits = SiteVisit.objects.all()
        open_leads = inquiries.exclude(inquiry_status__in=Inquiry.FINISHED_STATUSES)
        upcoming = visits.filter(status=SiteVisit.Status.SCHEDULED, scheduled_at__gte=now)

        property_status = counts_by(properties, 'status')
        lead_status = counts_by(inquiries, 'inquiry_status')

        recent_inquiries = [
            {'id': i.id, 'customer_name': i.customer_name, 'phone': i.phone,
             'property_title': i.property.title if i.property_id else None,
             'inquiry_status': i.inquiry_status, 'inquiry_status_display': i.get_inquiry_status_display(),
             'created_at': i.created_at}
            for i in inquiries.select_related('property').order_by('-created_at')[:6]
        ]
        upcoming_visits = SiteVisitSerializer(
            upcoming.select_related('customer', 'property__city', 'property__locality', 'assigned_to')
            .order_by('scheduled_at')[:6], many=True).data

        return Response({
            'properties': {
                'total': properties.count(),
                'available': property_status.get('available', 0),
                'sold': property_status.get('sold', 0),
                'rented': property_status.get('rented', 0),
                'leased': property_status.get('leased', 0),
                'draft': property_status.get('draft', 0),
                'featured': properties.filter(featured=True).count(),
                'by_listing_type': counts_by(properties, 'listing_type'),
                'by_category': counts_by(properties, 'category'),
                'by_type': counts_by(properties, 'property_type'),
            },
            'inquiries': {
                'total': inquiries.count(),
                'new': lead_status.get('new', 0),
                'last_30_days': inquiries.filter(created_at__gte=now - timedelta(days=30)).count(),
                'follow_ups_due': open_leads.filter(follow_up_date__lte=today).count(),
                'by_status': lead_status,
            },
            'site_visits': {
                'scheduled': upcoming.count(),
                'today': visits.filter(status=SiteVisit.Status.SCHEDULED, scheduled_at__date=today).count(),
                'completed': visits.filter(status=SiteVisit.Status.COMPLETED).count(),
            },
            'customers': {'total': Customer.objects.count()},
            'recent_inquiries': recent_inquiries,
            'upcoming_visits': upcoming_visits,
        })
