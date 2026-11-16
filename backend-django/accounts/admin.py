from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'get_full_name', 'phone', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'is_superuser', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']
    ordering = ['-date_joined']

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'phone')}),
        ('Role', {
            'fields': ('role', 'is_active'),
            'description': 'Admin, Dealer and Staff can sign in here and manage properties and enquiries. '
                           'Permissions are applied automatically from the role.',
        }),
        ('Advanced permissions', {'classes': ('collapse',), 'fields': ('is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'phone', 'role', 'password1', 'password2'),
        }),
    )
    readonly_fields = ['last_login', 'date_joined']

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        # Only superusers can grant superuser or hand-pick permissions.
        if not request.user.is_superuser:
            fields += ['is_superuser', 'groups', 'user_permissions']
        return fields
