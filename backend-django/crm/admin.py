from django.contrib import admin

from inquiries.models import Inquiry
from .models import Customer, SiteVisit


class InquiryInline(admin.TabularInline):
    model = Inquiry
    fields = ['created_at', 'property', 'inquiry_type', 'inquiry_status', 'message']
    readonly_fields = fields
    extra = 0
    can_delete = False
    show_change_link = True

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'created_at']
    search_fields = ['name', 'phone', 'email']
    date_hierarchy = 'created_at'
    inlines = [InquiryInline]


@admin.register(SiteVisit)
class SiteVisitAdmin(admin.ModelAdmin):
    list_display = ['scheduled_at', 'customer', 'property', 'status', 'assigned_to']
    list_editable = ['status']
    list_filter = ['status', 'scheduled_at']
    search_fields = ['customer__name', 'customer__phone', 'property__title']
    autocomplete_fields = ['customer', 'property', 'inquiry']
    date_hierarchy = 'scheduled_at'
    list_select_related = ['customer', 'property', 'assigned_to']
