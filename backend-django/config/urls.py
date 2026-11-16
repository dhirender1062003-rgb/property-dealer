from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from core.views import SiteSettingsView, health

admin.site.site_header = 'Property Dealer Admin'
admin.site.site_title = 'Property Dealer Admin'
admin.site.index_title = 'Manage properties, enquiries and website settings'

api_patterns = [
    path('health/', health, name='health'),
    path('site-settings/', SiteSettingsView.as_view(), name='site-settings'),
    path('', include('accounts.urls')),
    path('', include('inquiries.urls')),
    path('', include('crm.urls')),
    path('', include('properties.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(api_patterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
