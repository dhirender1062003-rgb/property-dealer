from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsManagement(BasePermission):
    """Admins, dealers and staff."""

    message = 'You do not have permission to manage this resource.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_management)


class IsAdminOrDealer(BasePermission):
    message = 'Only admins and dealers can do this.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.is_active
            and (user.is_superuser or user.role in ('admin', 'dealer'))
        )


class IsAdminRole(BasePermission):
    message = 'Only admins can do this.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and (user.is_superuser or user.role == 'admin'))


class ReadOnlyOrManagement(BasePermission):
    """Anyone can read; only management roles can write."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return IsManagement().has_permission(request, view)
