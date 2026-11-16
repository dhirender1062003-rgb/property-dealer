from django.contrib import admin
from django.shortcuts import redirect
from django.urls import reverse

from .models import SiteSettings


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Business', {'fields': ('business_name', 'tagline', 'logo')}),
        ('Contact details shown on the website', {'fields': ('phone', 'whatsapp_number', 'email', 'address', 'office_hours')}),
        ('Social media', {'fields': ('social_links',)}),
    )

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        # There is only one settings record, so open it directly.
        obj = SiteSettings.load()
        return redirect(reverse('admin:core_sitesettings_change', args=[obj.pk]))
