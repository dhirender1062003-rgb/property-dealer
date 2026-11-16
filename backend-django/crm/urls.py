from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import CustomerViewSet, DashboardStatsView, SiteVisitViewSet

router = SimpleRouter()
router.register('customers', CustomerViewSet, basename='customer')
router.register('site-visits', SiteVisitViewSet, basename='site-visit')

urlpatterns = [
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    *router.urls,
]
