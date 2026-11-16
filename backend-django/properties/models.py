import uuid
from decimal import Decimal
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.db.models import Q
from PIL import Image, ImageOps

from core.utils import unique_slug
from core.validators import validate_image_extension, validate_image_size


# --------------------------------------------------------------------------
# Locations (managed in Django admin)
# --------------------------------------------------------------------------

class City(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True,
                            help_text='Used in website links. Leave blank to generate from the name.')
    state = models.CharField(max_length=100, default='Uttar Pradesh')
    description = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to='cities/', blank=True,
                              validators=[validate_image_extension, validate_image_size],
                              help_text='Optional photo for the "Areas We Serve" section.')
    display_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name_plural = 'cities'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name, fallback='city')
        super().save(*args, **kwargs)


class Locality(models.Model):
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='localities')
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=130, blank=True)
    display_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['city', 'display_order', 'name']
        verbose_name_plural = 'localities'
        constraints = [
            models.UniqueConstraint(fields=['city', 'slug'], name='unique_locality_slug_per_city'),
            models.UniqueConstraint(fields=['city', 'name'], name='unique_locality_name_per_city'),
        ]

    def __str__(self):
        return f'{self.name}, {self.city.name}' if self.city_id else self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name, queryset=Locality.objects.filter(city_id=self.city_id),
                                    fallback='locality')
        super().save(*args, **kwargs)


class Amenity(models.Model):
    name = models.CharField(max_length=80, unique=True)
    icon = models.CharField(max_length=50, blank=True,
                            help_text='Optional icon name from lucide.dev, e.g. "dumbbell" or "car".')
    display_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name_plural = 'amenities'

    def __str__(self):
        return self.name


# --------------------------------------------------------------------------
# Property
# --------------------------------------------------------------------------

class Property(models.Model):
    class Category(models.TextChoices):
        RESIDENTIAL = 'residential', 'Residential'
        COMMERCIAL = 'commercial', 'Commercial'

    class PropertyType(models.TextChoices):
        FLAT = 'flat', 'Flat'
        APARTMENT = 'apartment', 'Apartment'
        INDEPENDENT_HOUSE = 'independent_house', 'Independent House'
        VILLA = 'villa', 'Villa'
        BUILDER_FLOOR = 'builder_floor', 'Builder Floor'
        RESIDENTIAL_PLOT = 'residential_plot', 'Residential Plot'
        FARM_HOUSE = 'farm_house', 'Farm House'
        SHOP = 'shop', 'Shop'
        SHOWROOM = 'showroom', 'Showroom'
        OFFICE = 'office', 'Office'
        COMMERCIAL_BUILDING = 'commercial_building', 'Commercial Building'
        WAREHOUSE = 'warehouse', 'Warehouse'
        INDUSTRIAL = 'industrial', 'Industrial Property'
        COMMERCIAL_PLOT = 'commercial_plot', 'Commercial Plot'

    RESIDENTIAL_TYPES = ('flat', 'apartment', 'independent_house', 'villa', 'builder_floor',
                         'residential_plot', 'farm_house')
    COMMERCIAL_TYPES = ('shop', 'showroom', 'office', 'commercial_building', 'warehouse',
                        'industrial', 'commercial_plot')
    TYPE_CATEGORY = dict.fromkeys(RESIDENTIAL_TYPES, 'residential') | dict.fromkeys(COMMERCIAL_TYPES, 'commercial')

    class ListingType(models.TextChoices):
        BUY = 'buy', 'Buy'
        RENT = 'rent', 'Rent'
        LEASE = 'lease', 'Lease'

    class AreaUnit(models.TextChoices):
        SQFT = 'sqft', 'Sq. Ft.'
        SQYD = 'sqyd', 'Sq. Yard'
        SQM = 'sqm', 'Sq. Metre'
        ACRE = 'acre', 'Acre'

    AREA_TO_SQFT = {'sqft': Decimal('1'), 'sqyd': Decimal('9'), 'sqm': Decimal('10.7639'), 'acre': Decimal('43560')}

    class Furnishing(models.TextChoices):
        UNFURNISHED = 'unfurnished', 'Unfurnished'
        SEMI_FURNISHED = 'semi_furnished', 'Semi-Furnished'
        FULLY_FURNISHED = 'fully_furnished', 'Fully Furnished'

    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        SOLD = 'sold', 'Sold'
        RENTED = 'rented', 'Rented'
        LEASED = 'leased', 'Leased'
        DRAFT = 'draft', 'Draft (hidden)'

    class Possession(models.TextChoices):
        READY = 'ready', 'Ready to Move'
        UNDER_CONSTRUCTION = 'under_construction', 'Under Construction'

    class Facing(models.TextChoices):
        NORTH = 'North', 'North'
        SOUTH = 'South', 'South'
        EAST = 'East', 'East'
        WEST = 'West', 'West'
        NORTH_EAST = 'North-East', 'North-East'
        NORTH_WEST = 'North-West', 'North-West'
        SOUTH_EAST = 'South-East', 'South-East'
        SOUTH_WEST = 'South-West', 'South-West'
        MAIN_ROAD = 'Main Road', 'Main Road'

    class Age(models.TextChoices):
        NEW = '0-1 years', 'New (0-1 years)'
        ONE_TO_FIVE = '1-5 years', '1-5 years'
        FIVE_TO_TEN = '5-10 years', '5-10 years'
        TEN_PLUS = '10+ years', '10+ years'

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True,
                            help_text='Website link. Generated from the title; kept the same if the title changes.')
    property_type = models.CharField(max_length=30, choices=PropertyType.choices)
    category = models.CharField(max_length=20, choices=Category.choices, editable=False,
                                help_text='Set automatically from the property type.')
    listing_type = models.CharField(max_length=10, choices=ListingType.choices)

    price = models.PositiveBigIntegerField(validators=[MinValueValidator(1)],
                                           help_text='In rupees. Total price for sale; monthly rent for rent/lease.')
    area = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    area_unit = models.CharField(max_length=10, choices=AreaUnit.choices, default=AreaUnit.SQFT)
    area_sqft = models.DecimalField(max_digits=14, decimal_places=2, editable=False, default=0,
                                    help_text='Area converted to square feet, used for filtering and sorting.')

    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name='properties')
    locality = models.ForeignKey(Locality, on_delete=models.SET_NULL, null=True, blank=True, related_name='properties')
    address = models.CharField(max_length=300, blank=True)

    bedrooms = models.PositiveSmallIntegerField(null=True, blank=True)
    bathrooms = models.PositiveSmallIntegerField(null=True, blank=True)
    balconies = models.PositiveSmallIntegerField(null=True, blank=True)
    furnishing_status = models.CharField(max_length=20, choices=Furnishing.choices, blank=True)
    floor = models.SmallIntegerField(null=True, blank=True, help_text='0 = ground floor.')
    total_floors = models.PositiveSmallIntegerField(null=True, blank=True)
    facing = models.CharField(max_length=20, choices=Facing.choices, blank=True)
    parking = models.PositiveSmallIntegerField(null=True, blank=True, help_text='Number of parking spaces.')
    possession_status = models.CharField(max_length=20, choices=Possession.choices, blank=True)
    property_age = models.CharField(max_length=20, choices=Age.choices, blank=True)

    description = models.TextField(blank=True)
    amenities = models.ManyToManyField(Amenity, blank=True, related_name='properties')

    featured = models.BooleanField(default=False, db_index=True, help_text='Show on the homepage.')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE, db_index=True)
    is_demo = models.BooleanField(default=False, db_index=True,
                                  help_text='Development sample listing. Shown with a "Sample" label.')

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='properties_created', editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'properties'
        indexes = [
            models.Index(fields=['status', 'listing_type'], name='prop_status_listing_idx'),
            models.Index(fields=['city', 'locality'], name='prop_city_locality_idx'),
            models.Index(fields=['status', 'featured'], name='prop_status_featured_idx'),
            models.Index(fields=['price'], name='prop_price_idx'),
            models.Index(fields=['area_sqft'], name='prop_area_idx'),
            models.Index(fields=['property_type'], name='prop_type_idx'),
        ]

    def __str__(self):
        return self.title

    @property
    def price_period(self):
        return 'month' if self.listing_type in (self.ListingType.RENT, self.ListingType.LEASE) else None

    def clean(self):
        errors = {}
        if self.locality_id and self.city_id and self.locality.city_id != self.city_id:
            errors['locality'] = f'{self.locality.name} is not in {self.city.name}.'
        if self.floor is not None and self.total_floors and self.floor > self.total_floors:
            errors['floor'] = 'Floor cannot be higher than the total number of floors.'
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.category = self.TYPE_CATEGORY.get(self.property_type, self.Category.RESIDENTIAL)
        factor = self.AREA_TO_SQFT.get(self.area_unit, Decimal('1'))
        self.area_sqft = (Decimal(self.area or 0) * factor).quantize(Decimal('0.01'))
        if not self.slug:
            self.slug = unique_slug(self, self.title, fallback='property')
        super().save(*args, **kwargs)


# --------------------------------------------------------------------------
# Property images
# --------------------------------------------------------------------------

MAX_IMAGE_DIMENSION = 2000  # px; larger photos are scaled down on upload


def property_image_path(instance, filename):
    return f'properties/{instance.property_id}/{uuid.uuid4().hex}{Path(filename).suffix.lower()}'


def optimize_image(uploaded):
    """
    Fix phone-camera rotation, scale down very large photos and re-encode as
    WebP. Re-encoding also strips any non-image content hidden in the file.
    """
    uploaded.seek(0)
    with Image.open(uploaded) as img:
        img = ImageOps.exif_transpose(img)
        img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION))
        if img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGBA' if 'A' in img.getbands() else 'RGB')
        buffer = BytesIO()
        img.save(buffer, format='WEBP', quality=82, method=4)
    return ContentFile(buffer.getvalue(), name=f'{uuid.uuid4().hex}.webp')


class PropertyImage(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=property_image_path, validators=[validate_image_extension, validate_image_size])
    alt_text = models.CharField(max_length=200, blank=True, help_text='Short description of the photo.')
    is_primary = models.BooleanField(default=False, help_text='Main photo shown on property cards.')
    display_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_primary', 'display_order', 'id']
        constraints = [
            models.UniqueConstraint(fields=['property'], condition=Q(is_primary=True),
                                    name='one_primary_image_per_property'),
        ]

    def __str__(self):
        return self.alt_text or f'Photo {self.pk} of {self.property}'

    def save(self, *args, **kwargs):
        if self.image and not getattr(self.image, '_committed', True):
            self.image = optimize_image(self.image)
        with transaction.atomic():
            siblings = PropertyImage.objects.filter(property_id=self.property_id).exclude(pk=self.pk)
            if self.is_primary:
                siblings.filter(is_primary=True).update(is_primary=False)
            elif not siblings.filter(is_primary=True).exists():
                # The first photo of a property becomes its primary photo.
                self.is_primary = True
            super().save(*args, **kwargs)
