from django.urls import path

from .views import LoginView, MeView, RefreshView, RegisterView, TeamView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('team/', TeamView.as_view(), name='team'),
]
