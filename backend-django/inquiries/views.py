import django_filters
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from accounts.permissions import IsAdminRole, IsManagement
from .models import Inquiry
from .serializers import InquiryCreateSerializer, InquirySerializer, LeadCreateSerializer


def client_ip(request):
    return request.META.get('REMOTE_ADDR')


class InquiryFilter(django_filters.FilterSet):
    FOLLOW_UP_CHOICES = [('overdue', 'Overdue'), ('today', 'Today'), ('upcoming', 'Upcoming'), ('none', 'Not set')]

    follow_up = django_filters.ChoiceFilter(choices=FOLLOW_UP_CHOICES, method='filter_follow_up')
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='date__lte')

    class Meta:
        model = Inquiry
        fields = ['inquiry_status', 'inquiry_type', 'property', 'assigned_to', 'customer']

    def filter_follow_up(self, queryset, name, value):
        today = timezone.localdate()
        if value == 'none':
            return queryset.filter(follow_up_date__isnull=True)
        queryset = queryset.exclude(inquiry_status__in=Inquiry.FINISHED_STATUSES)
        if value == 'overdue':
            return queryset.filter(follow_up_date__lt=today)
        if value == 'today':
            return queryset.filter(follow_up_date=today)
        return queryset.filter(follow_up_date__gt=today)


class InquiryViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                     mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """
    POST   /api/inquiries/        submit an enquiry (anyone, rate limited) or add a lead (staff)
    GET    /api/inquiries/        list leads                     (admin, dealer, staff)
    GET    /api/inquiries/<id>/   one lead                       (admin, dealer, staff)
    PATCH  /api/inquiries/<id>/   status / follow-up / notes     (admin, dealer, staff)
    DELETE /api/inquiries/<id>/   delete                         (admin)
    Filters: inquiry_status, inquiry_type, property, assigned_to, customer,
             follow_up=overdue|today|upcoming|none, created_after, created_before, search
    """

    queryset = Inquiry.objects.select_related('property', 'preferred_city', 'assigned_to')
    filterset_class = InquiryFilter
    search_fields = ['customer_name', 'phone', 'email', 'message', 'property__title']
    ordering_fields = ['created_at', 'inquiry_status', 'follow_up_date']
    ordering = ['-created_at']

    def is_staff_request(self):
        user = self.request.user
        return user.is_authenticated and user.is_management

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        if self.action == 'destroy':
            return [IsAdminRole()]
        return [IsManagement()]

    def get_throttles(self):
        if self.action == 'create' and not self.is_staff_request():
            self.throttle_scope = 'inquiries'
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def get_serializer_class(self):
        if self.action == 'create':
            return LeadCreateSerializer if self.is_staff_request() else InquiryCreateSerializer
        return InquirySerializer

    def create(self, request, *args, **kwargs):
        if self.is_staff_request():
            return super().create(request, *args, **kwargs)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        inquiry = serializer.save(
            ip_address=client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:300],
        )
        # Only reached after the row is saved, so success always means "saved".
        return Response(
            {'id': inquiry.id, 'detail': 'Thank you! Your enquiry has been received.'},
            status=status.HTTP_201_CREATED,
        )
