from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AmenityViewSet, CategoryView, CityViewSet, LocalityViewSet, PropertyImageViewSet, PropertyViewSet

router = DefaultRouter()
router.register('properties', PropertyViewSet, basename='property')
router.register('property-images', PropertyImageViewSet, basename='property-image')
router.register('cities', CityViewSet, basename='city')
router.register('localities', LocalityViewSet, basename='locality')
router.register('amenities', AmenityViewSet, basename='amenity')

urlpatterns = [
    path('categories/', CategoryView.as_view(), name='categories'),
    *router.urls,
]
