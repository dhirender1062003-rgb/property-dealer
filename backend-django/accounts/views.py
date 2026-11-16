from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .permissions import IsManagement
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_scope = 'auth'


class RefreshView(TokenRefreshView):
    throttle_scope = 'auth'


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = 'auth'


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class TeamView(generics.ListAPIView):
    """GET /api/team/ — active admins, dealers and staff (for "assign to" lists)."""

    serializer_class = UserSerializer
    permission_classes = [IsManagement]
    pagination_class = None
    filter_backends = []

    def get_queryset(self):
        User = get_user_model()
        return (User.objects.filter(is_active=True)
                .filter(Q(is_superuser=True) | Q(role__in=User.MANAGEMENT_ROLES))
                .order_by('first_name', 'username'))
