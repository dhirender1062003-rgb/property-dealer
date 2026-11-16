from django.http import JsonResponse
from rest_framework import generics
from rest_framework.permissions import AllowAny

from accounts.permissions import IsAdminRole
from .models import SiteSettings
from .serializers import SiteSettingsSerializer


def health(request):
    return JsonResponse({'status': 'ok', 'service': 'django-api'})


class SiteSettingsView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/site-settings/   public contact details for the website
    PATCH /api/site-settings/   update (admin only)
    """

    serializer_class = SiteSettingsSerializer

    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsAdminRole()]

    def get_object(self):
        return SiteSettings.load()
