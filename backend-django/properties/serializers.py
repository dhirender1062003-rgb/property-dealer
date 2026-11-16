from django.conf import settings
from rest_framework import serializers

from core.validators import validate_image_size
from .models import Amenity, City, Locality, Property, PropertyImage


# --------------------------------------------------------------------------
# Locations & amenities
# --------------------------------------------------------------------------

class LocalitySerializer(serializers.ModelSerializer):
    city = serializers.SlugRelatedField(slug_field='slug', queryset=City.objects.all())

    class Meta:
        model = Locality
        fields = ['id', 'name', 'slug', 'city', 'display_order', 'is_active']
        read_only_fields = ['slug']

    def validate_name(self, value):
        value = ' '.join(value.split())
        if len(value) < 2:
            raise serializers.ValidationError('Please enter a locality name.')
        return value


class CitySerializer(serializers.ModelSerializer):
    localities = serializers.SerializerMethodField()
    property_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = City
        fields = ['id', 'name', 'slug', 'state', 'description', 'image', 'display_order', 'is_active',
                  'property_count', 'localities']
        read_only_fields = ['slug']

    def get_localities(self, city):
        # Uses the localities prefetched by the view (active only for the public).
        localities = getattr(city, 'loaded_localities', None)
        if localities is None:
            localities = city.localities.all()
        return [{'id': loc.id, 'name': loc.name, 'slug': loc.slug, 'display_order': loc.display_order,
                 'is_active': loc.is_active} for loc in localities]


class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ['id', 'name', 'icon']


# --------------------------------------------------------------------------
# Images
# --------------------------------------------------------------------------

class PropertyImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'display_order']
        read_only_fields = ['id', 'image']


class PropertyImageUploadSerializer(serializers.Serializer):
    """POST /api/properties/<id>/images/ — one or more files in the `images` field."""

    images = serializers.ListField(
        child=serializers.ImageField(validators=[validate_image_size]),
        allow_empty=False,
        max_length=20,
    )
    alt_text = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate_images(self, files):
        allowed = {'.jpg', '.jpeg', '.png', '.webp'}
        for f in files:
            if not any(f.name.lower().endswith(ext) for ext in allowed):
                raise serializers.ValidationError(f'"{f.name}": only JPG, PNG and WebP images are allowed.')
        prop = self.context['property']
        limit = settings.MAX_IMAGES_PER_PROPERTY
        if prop.images.count() + len(files) > limit:
            raise serializers.ValidationError(f'A property can have at most {limit} photos.')
        return files


class ImageReorderSerializer(serializers.Serializer):
    order = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


# --------------------------------------------------------------------------
# Properties
# --------------------------------------------------------------------------

class PropertyListSerializer(serializers.ModelSerializer):
    """Compact shape used by property cards."""

    property_type_display = serializers.CharField(source='get_property_type_display', read_only=True)
    price_period = serializers.CharField(read_only=True)
    city = serializers.SlugRelatedField(slug_field='slug', read_only=True)
    city_name = serializers.CharField(source='city.name', read_only=True)
    locality = serializers.SlugRelatedField(slug_field='slug', read_only=True)
    locality_name = serializers.CharField(source='locality.name', read_only=True, default='')
    primary_image = serializers.SerializerMethodField()
    is_sample = serializers.BooleanField(source='is_demo', read_only=True)

    class Meta:
        model = Property
        fields = [
            'id', 'slug', 'title', 'property_type', 'property_type_display', 'category', 'listing_type',
            'price', 'price_period', 'area', 'area_unit', 'area_sqft',
            'city', 'city_name', 'locality', 'locality_name',
            'bedrooms', 'bathrooms', 'furnishing_status', 'featured', 'status',
            'primary_image', 'is_sample', 'created_at',
        ]

    def get_primary_image(self, obj):
        # `images` is prefetched and ordered primary-first.
        images = list(obj.images.all())
        if not images:
            return None
        request = self.context.get('request')
        url = images[0].image.url
        return request.build_absolute_uri(url) if request else url


class PropertyDetailSerializer(PropertyListSerializer):
    images = PropertyImageSerializer(many=True, read_only=True)
    amenities = AmenitySerializer(many=True, read_only=True)
    city_id = serializers.IntegerField(read_only=True)
    locality_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta(PropertyListSerializer.Meta):
        fields = PropertyListSerializer.Meta.fields + [
            'address', 'balconies', 'floor', 'total_floors', 'facing', 'parking',
            'possession_status', 'property_age', 'description', 'amenities', 'images', 'updated_at',
            'city_id', 'locality_id',
        ]


class PropertyWriteSerializer(serializers.ModelSerializer):
    """Create/update by staff. `city`, `locality` and `amenities` are ids."""

    city = serializers.PrimaryKeyRelatedField(queryset=City.objects.all())
    locality = serializers.PrimaryKeyRelatedField(queryset=Locality.objects.all(), required=False, allow_null=True)
    amenities = serializers.PrimaryKeyRelatedField(queryset=Amenity.objects.all(), many=True, required=False)

    class Meta:
        model = Property
        fields = [
            'title', 'property_type', 'listing_type', 'price', 'area', 'area_unit',
            'city', 'locality', 'address', 'bedrooms', 'bathrooms', 'balconies', 'furnishing_status',
            'floor', 'total_floors', 'facing', 'parking', 'possession_status', 'property_age',
            'description', 'amenities', 'featured', 'status',
        ]

    def validate(self, attrs):
        city = attrs.get('city', getattr(self.instance, 'city', None))
        locality = attrs.get('locality', getattr(self.instance, 'locality', None))
        if locality and city and locality.city_id != city.id:
            raise serializers.ValidationError({'locality': f'{locality.name} is not in {city.name}.'})
        floor = attrs.get('floor', getattr(self.instance, 'floor', None))
        total = attrs.get('total_floors', getattr(self.instance, 'total_floors', None))
        if floor is not None and total and floor > total:
            raise serializers.ValidationError({'floor': 'Floor cannot be higher than the total number of floors.'})
        return attrs

    def to_representation(self, instance):
        return PropertyDetailSerializer(instance, context=self.context).data
