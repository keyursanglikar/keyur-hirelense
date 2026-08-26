from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to super admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'super_admin')

class IsFirmAdmin(permissions.BasePermission):
    """
    Allows access only to firm admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'firm_admin')

class IsStaffUser(permissions.BasePermission):
    """
    Allows access only to staff users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'staff')

class HasModuleAccess(permissions.BasePermission):
    """
    Check if the user's firm has an active subscription for the requested module.
    (Requires module_slug or similar context to be passed in view/kwargs)
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.role == 'super_admin':
            return True # Super admin can access anything
            
        # Example implementation for checking module access
        # This will be fully implemented when subscriptions models are wired up
        # slug = view.kwargs.get('module_slug')
        
        return True # Default to True for now during migration
