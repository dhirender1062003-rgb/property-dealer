import django_filters

from .models import Property


class PropertyFilter(django_filters.FilterSet):
    """
    Query parameters for GET /api/properties/ (names match the React frontend).
    Example: ?listing_type=rent&city=noida&locality=sector-62&min_price=20000&bedrooms=2
    """

    city = django_filters.CharFilter(field_name='city__slug')
    locality = django_filters.CharFilter(field_name='locality__slug')
    property_type = django_filters.MultipleChoiceFilter(choices=Property.PropertyType.choices)
    category = django_filters.ChoiceFilter(choices=Property.Category.choices)
    listing_type = django_filters.ChoiceFilter(choices=Property.ListingType.choices)
    furnishing_status = django_filters.ChoiceFilter(choices=Property.Furnishing.choices)
    status = django_filters.ChoiceFilter(choices=Property.Status.choices)
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    min_area = django_filters.NumberFilter(field_name='area_sqft', lookup_expr='gte', label='Minimum area (sq.ft)')
    max_area = django_filters.NumberFilter(field_name='area_sqft', lookup_expr='lte', label='Maximum area (sq.ft)')
    bedrooms = django_filters.NumberFilter(field_name='bedrooms', lookup_expr='gte', label='Minimum bedrooms')
    bathrooms = django_filters.NumberFilter(field_name='bathrooms', lookup_expr='gte', label='Minimum bathrooms')
    featured = django_filters.BooleanFilter()

    class Meta:
        model = Property
        fields = []
