from django import forms
from django.contrib import admin, messages
from django.db import transaction
from django.utils.html import format_html

from core.validators import validate_image_extension, validate_image_size
from .models import Amenity, City, Locality, Property, PropertyImage


# --------------------------------------------------------------------------
# Multiple photo upload field (Django's recommended pattern)
# --------------------------------------------------------------------------

class MultipleFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True


class MultipleImageField(forms.ImageField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('widget', MultipleFileInput(attrs={'accept': 'image/jpeg,image/png,image/webp'}))
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        single = super().clean
        files = data if isinstance(data, (list, tuple)) else [data]
        return [single(f, initial) for f in files if f]


class PropertyAdminForm(forms.ModelForm):
    upload_images = MultipleImageField(
        required=False, label='Upload photos',
        validators=[validate_image_extension, validate_image_size],
        help_text='Select one or more JPG, PNG or WebP photos (max 5 MB each). '
                  'The first photo becomes the main photo if none is set.',
    )

    class Meta:
        model = Property
        fields = '__all__'


# --------------------------------------------------------------------------
# Properties
# --------------------------------------------------------------------------

def thumbnail(image, size=60):
    if not image:
        return '—'
    return format_html('<img src="{}" style="width:{}px;height:{}px;object-fit:cover;border-radius:6px">',
                       image.url, size, int(size * 0.75))


class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 0
    fields = ['preview', 'image', 'alt_text', 'is_primary', 'display_order']
    readonly_fields = ['preview']
    ordering = ['-is_primary', 'display_order', 'id']

    @admin.display(description='Preview')
    def preview(self, obj):
        return thumbnail(obj.image, 90)


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    form = PropertyAdminForm
    inlines = [PropertyImageInline]
    list_display = ['main_photo', 'title', 'listing_type', 'property_type', 'city', 'locality', 'price_display',
                    'status', 'featured', 'is_demo', 'created_at']
    list_display_links = ['main_photo', 'title']
    list_editable = ['status', 'featured']
    list_filter = ['status', 'listing_type', 'category', 'property_type', 'featured', 'city', 'is_demo', 'created_at']
    search_fields = ['title', 'slug', 'address', 'locality__name', 'city__name', 'description']
    autocomplete_fields = ['city', 'locality']
    filter_horizontal = ['amenities']
    readonly_fields = ['slug', 'category', 'area_sqft', 'created_by', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['mark_available', 'mark_sold', 'mark_rented', 'mark_leased', 'make_featured', 'remove_featured']

    fieldsets = (
        ('Basic details', {'fields': ('title', 'slug', 'listing_type', 'property_type', 'category', 'status', 'featured')}),
        ('Price & area', {
            'fields': ('price', ('area', 'area_unit'), 'area_sqft'),
            'description': 'Price in rupees: total price for sale, monthly rent for rent/lease.',
        }),
        ('Location', {'fields': ('city', 'locality', 'address')}),
        ('Specifications', {'fields': (
            ('bedrooms', 'bathrooms', 'balconies'), 'furnishing_status', ('floor', 'total_floors'),
            'facing', 'parking', 'possession_status', 'property_age',
        )}),
        ('Description & amenities', {'fields': ('description', 'amenities')}),
        ('Photos', {'fields': ('upload_images',)}),
        ('Record', {'classes': ('collapse',), 'fields': ('is_demo', 'created_by', 'created_at', 'updated_at')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('city', 'locality').prefetch_related('images')

    @admin.display(description='Photo')
    def main_photo(self, obj):
        images = list(obj.images.all())
        primary = next((i for i in images if i.is_primary), images[0] if images else None)
        return thumbnail(primary.image if primary else None)

    @admin.display(description='Price', ordering='price')
    def price_display(self, obj):
        value = obj.price
        if value >= 10_000_000:
            text = f'₹{value / 10_000_000:.2f} Cr'
        elif value >= 100_000:
            text = f'₹{value / 100_000:.2f} Lac'
        else:
            text = f'₹{value:,}'
        return f'{text}/month' if obj.price_period else text

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        files = form.cleaned_data.get('upload_images') or []
        if files:
            prop = form.instance
            start = prop.images.count()
            with transaction.atomic():
                for i, f in enumerate(files):
                    PropertyImage.objects.create(property=prop, image=f, display_order=start + i)
            self.message_user(request, f'{len(files)} photo(s) uploaded.', messages.SUCCESS)

    def _set_status(self, request, queryset, status, label):
        updated = queryset.update(status=status)
        self.message_user(request, f'{updated} propert{"y" if updated == 1 else "ies"} marked as {label}.')

    @admin.action(description='Mark selected as Available')
    def mark_available(self, request, queryset):
        self._set_status(request, queryset, Property.Status.AVAILABLE, 'Available')

    @admin.action(description='Mark selected as Sold')
    def mark_sold(self, request, queryset):
        self._set_status(request, queryset, Property.Status.SOLD, 'Sold')

    @admin.action(description='Mark selected as Rented')
    def mark_rented(self, request, queryset):
        self._set_status(request, queryset, Property.Status.RENTED, 'Rented')

    @admin.action(description='Mark selected as Leased')
    def mark_leased(self, request, queryset):
        self._set_status(request, queryset, Property.Status.LEASED, 'Leased')

    @admin.action(description='Show selected on homepage (featured)')
    def make_featured(self, request, queryset):
        self.message_user(request, f'{queryset.update(featured=True)} marked as featured.')

    @admin.action(description='Remove selected from homepage')
    def remove_featured(self, request, queryset):
        self.message_user(request, f'{queryset.update(featured=False)} removed from featured.')


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ['preview', 'property', 'alt_text', 'is_primary', 'display_order', 'created_at']
    list_filter = ['is_primary']
    search_fields = ['property__title', 'alt_text']
    autocomplete_fields = ['property']

    @admin.display(description='Preview')
    def preview(self, obj):
        return thumbnail(obj.image)


# --------------------------------------------------------------------------
# Locations & amenities
# --------------------------------------------------------------------------

class LocalityInline(admin.TabularInline):
    model = Locality
    extra = 1
    fields = ['name', 'slug', 'display_order', 'is_active']


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ['name', 'state', 'locality_count', 'display_order', 'is_active']
    list_editable = ['display_order', 'is_active']
    search_fields = ['name']
    prepopulated_fields = {'slug': ['name']}
    inlines = [LocalityInline]

    @admin.display(description='Localities')
    def locality_count(self, obj):
        return obj.localities.count()


@admin.register(Locality)
class LocalityAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'display_order', 'is_active']
    list_editable = ['display_order', 'is_active']
    list_filter = ['city', 'is_active']
    search_fields = ['name', 'city__name']
    prepopulated_fields = {'slug': ['name']}
    list_select_related = ['city']
    list_per_page = 50


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'display_order', 'is_active']
    list_editable = ['icon', 'display_order', 'is_active']
    search_fields = ['name']
