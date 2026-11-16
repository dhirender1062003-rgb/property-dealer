from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrDealer, IsManagement, ReadOnlyOrManagement
from .filters import PropertyFilter
from .models import Amenity, City, Locality, Property, PropertyImage
from .serializers import (
    AmenitySerializer, CitySerializer, ImageReorderSerializer, LocalitySerializer, PropertyDetailSerializer,
    PropertyImageSerializer, PropertyImageUploadSerializer, PropertyListSerializer, PropertyWriteSerializer,
)


def _limit(request, default, maximum=24):
    try:
        return max(1, min(int(request.query_params.get('limit', default)), maximum))
    except (TypeError, ValueError):
        return default


class PropertyViewSet(viewsets.ModelViewSet):
    """
    GET    /api/properties/                 list with filters, search, sorting, pagination
    GET    /api/properties/featured/        featured properties (?limit=6)
    GET    /api/properties/latest/          newest properties (?limit=8)
    GET    /api/properties/<slug or id>/    one property
    POST   /api/properties/                 create            (admin, dealer, staff)
    PUT    /api/properties/<id>/            replace           (admin, dealer, staff)
    PATCH  /api/properties/<id>/            update            (admin, dealer, staff)
    DELETE /api/properties/<id>/            delete            (admin, dealer)
    POST   /api/properties/<id>/images/          upload photos   (admin, dealer, staff)
    POST   /api/properties/<id>/images/reorder/  reorder photos  (admin, dealer, staff)
    """

    filterset_class = PropertyFilter
    search_fields = ['title', 'description', 'address', 'locality__name', 'city__name']
    ordering_fields = ['created_at', 'price', 'area_sqft']
    ordering = ['-created_at']
    lookup_value_regex = '[^/]+'

    def get_queryset(self):
        qs = Property.objects.select_related('city', 'locality').prefetch_related(
            Prefetch('images', queryset=PropertyImage.objects.order_by('-is_primary', 'display_order', 'id')),
        )
        if self.action == 'retrieve':
            qs = qs.prefetch_related('amenities')
        # The public only sees available listings; staff see everything.
        user = self.request.user
        if not (user.is_authenticated and user.is_management):
            qs = qs.filter(status=Property.Status.AVAILABLE)
        return qs

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminOrDealer()]
        if self.action in ('create', 'update', 'partial_update', 'upload_images', 'reorder_images'):
            return [IsManagement()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return PropertyWriteSerializer
        if self.action == 'retrieve':
            return PropertyDetailSerializer
        return PropertyListSerializer

    def get_object(self):
        # Pages link by slug; admin tools use the numeric id. Accept both.
        value = str(self.kwargs[self.lookup_url_kwarg or 'pk'])
        lookup = {'pk': int(value)} if value.isdigit() else {'slug': value}
        obj = get_object_or_404(self.get_queryset(), **lookup)
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False)
    def featured(self, request):
        qs = self.get_queryset().filter(featured=True, status=Property.Status.AVAILABLE)[: _limit(request, 6)]
        return Response(PropertyListSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=False)
    def latest(self, request):
        qs = self.get_queryset().filter(status=Property.Status.AVAILABLE).order_by('-created_at')[: _limit(request, 8)]
        return Response(PropertyListSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='images')
    def upload_images(self, request, pk=None):
        prop = self.get_object()
        serializer = PropertyImageUploadSerializer(data=request.data, context={'property': prop})
        serializer.is_valid(raise_exception=True)
        alt_text = serializer.validated_data.get('alt_text', '')
        start = prop.images.count()
        created = []
        with transaction.atomic():
            for i, file in enumerate(serializer.validated_data['images']):
                created.append(PropertyImage.objects.create(
                    property=prop, image=file, alt_text=alt_text, display_order=start + i,
                ))
        data = PropertyImageSerializer(created, many=True, context={'request': request}).data
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='images/reorder')
    def reorder_images(self, request, pk=None):
        prop = self.get_object()
        serializer = ImageReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.validated_data['order']
        existing = set(prop.images.values_list('id', flat=True))
        if set(order) != existing or len(order) != len(existing):
            return Response({'order': ['Send every photo id of this property exactly once.']},
                            status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for position, image_id in enumerate(order):
                PropertyImage.objects.filter(pk=image_id).update(display_order=position)
        images = prop.images.order_by('-is_primary', 'display_order', 'id')
        return Response(PropertyImageSerializer(images, many=True, context={'request': request}).data)


class PropertyImageViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin,
                           viewsets.GenericViewSet):
    """
    PATCH  /api/property-images/<id>/   change alt_text, is_primary or display_order
    DELETE /api/property-images/<id>/   delete the photo (file is removed from disk)
    """

    queryset = PropertyImage.objects.select_related('property')
    serializer_class = PropertyImageSerializer
    permission_classes = [IsManagement]


def is_management(request):
    return request.user.is_authenticated and request.user.is_management


class LocationPermissionsMixin:
    """Anyone can read locations; admins and dealers can change them."""

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminOrDealer()]


class CityViewSet(LocationPermissionsMixin, viewsets.ModelViewSet):
    """
    GET /api/cities/ — active cities with their active localities
    (staff also see hidden ones). POST/PATCH/DELETE: admin and dealer.
    """

    serializer_class = CitySerializer
    pagination_class = None
    lookup_field = 'slug'
    filter_backends = []

    def get_queryset(self):
        show_all = is_management(self.request)
        cities = City.objects.all() if show_all else City.objects.filter(is_active=True)
        localities = Locality.objects.all() if show_all else Locality.objects.filter(is_active=True)
        return (
            cities
            .annotate(property_count=Count('properties', filter=Q(properties__status=Property.Status.AVAILABLE)))
            .prefetch_related(Prefetch('localities', queryset=localities, to_attr='loaded_localities'))
        )

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({'detail': 'This city has properties, so it cannot be deleted. Hide it instead.'},
                            status=status.HTTP_400_BAD_REQUEST)


class LocalityViewSet(LocationPermissionsMixin, viewsets.ModelViewSet):
    """
    GET /api/localities/?city=noida&search=sector — active localities
    (staff also see hidden ones). POST/PATCH/DELETE: admin and dealer.
    """

    serializer_class = LocalitySerializer
    pagination_class = None
    search_fields = ['name']
    ordering_fields = ['name', 'display_order']

    def get_queryset(self):
        qs = Locality.objects.select_related('city')
        if not is_management(self.request):
            qs = qs.filter(is_active=True, city__is_active=True)
        city = self.request.query_params.get('city')
        if city:
            qs = qs.filter(city__slug=city)
        return qs


class AmenityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Amenity.objects.filter(is_active=True)
    serializer_class = AmenitySerializer
    pagination_class = None
    permission_classes = [ReadOnlyOrManagement]
    filter_backends = []


class CategoryView(APIView):
    """GET /api/categories/ — Residential/Commercial with their property types."""

    permission_classes = [AllowAny]

    def get(self, request):
        data = []
        for value, label in Property.Category.choices:
            data.append({
                'value': value,
                'label': label,
                'property_types': [
                    {'value': t_value, 'label': t_label}
                    for t_value, t_label in Property.PropertyType.choices
                    if Property.TYPE_CATEGORY[t_value] == value
                ],
            })
        return Response(data)
