from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html

from .models import Inquiry


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ['customer_name', 'phone', 'email', 'inquiry_type', 'property_link', 'budget',
                    'inquiry_status', 'follow_up_date', 'assigned_to', 'created_at']
    list_editable = ['inquiry_status']
    list_filter = ['inquiry_status', 'inquiry_type', 'preferred_city', 'created_at']
    search_fields = ['customer_name', 'phone', 'email', 'message', 'property__title']
    date_hierarchy = 'created_at'
    autocomplete_fields = ['property']
    readonly_fields = ['customer', 'customer_name', 'phone', 'email', 'property', 'inquiry_type', 'preferred_city', 'budget',
                       'message', 'source_page', 'ip_address', 'user_agent', 'created_at', 'updated_at']
    actions = ['mark_contacted', 'mark_closed', 'mark_spam']
    list_select_related = ['property', 'assigned_to']

    fieldsets = (
        ('Customer', {'fields': ('customer', 'customer_name', 'phone', 'email')}),
        ('Enquiry', {'fields': ('inquiry_type', 'property', 'preferred_city', 'budget', 'message')}),
        ('Follow-up', {'fields': ('inquiry_status', 'follow_up_date', 'assigned_to', 'admin_notes')}),
        ('Technical details', {'classes': ('collapse',),
                               'fields': ('source_page', 'ip_address', 'user_agent', 'created_at', 'updated_at')}),
    )

    def has_add_permission(self, request):
        # Enquiries come from the website form.
        return False

    @admin.display(description='Property')
    def property_link(self, obj):
        if not obj.property_id:
            return '—'
        url = reverse('admin:properties_property_change', args=[obj.property_id])
        return format_html('<a href="{}">{}</a>', url, obj.property.title)

    @admin.action(description='Mark selected as Contacted')
    def mark_contacted(self, request, queryset):
        self.message_user(request, f'{queryset.update(inquiry_status=Inquiry.Status.CONTACTED)} marked as contacted.')

    @admin.action(description='Mark selected as Closed')
    def mark_closed(self, request, queryset):
        self.message_user(request, f'{queryset.update(inquiry_status=Inquiry.Status.CLOSED)} marked as closed.')

    @admin.action(description='Mark selected as Spam')
    def mark_spam(self, request, queryset):
        self.message_user(request, f'{queryset.update(inquiry_status=Inquiry.Status.SPAM)} marked as spam.')
