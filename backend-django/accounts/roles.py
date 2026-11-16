"""
Django admin permissions for each role. Each role has a matching auth Group
("Admin", "Dealer", "Staff"); users are placed in their role's group
automatically whenever they are saved.

"app.*" means every permission of that app.
"""

from django.contrib.auth.models import Group, Permission

ROLE_PERMISSIONS = {
    'admin': [
        'accounts.*', 'properties.*', 'inquiries.*', 'core.*', 'crm.*',
        'auth.view_group',
    ],
    'dealer': [
        'properties.*', 'crm.*',
        'inquiries.view_inquiry', 'inquiries.change_inquiry', 'inquiries.add_inquiry',
        'core.view_sitesettings',
    ],
    'staff': [
        'properties.add_property', 'properties.change_property', 'properties.view_property',
        'properties.add_propertyimage', 'properties.change_propertyimage',
        'properties.delete_propertyimage', 'properties.view_propertyimage',
        'properties.view_city', 'properties.view_locality', 'properties.add_locality',
        'properties.view_amenity',
        'inquiries.view_inquiry', 'inquiries.change_inquiry', 'inquiries.add_inquiry',
        'crm.view_customer', 'crm.add_customer', 'crm.change_customer',
        'crm.view_sitevisit', 'crm.add_sitevisit', 'crm.change_sitevisit',
    ],
}


def group_name(role):
    return role.capitalize()


def permissions_for(patterns):
    perms = Permission.objects.none()
    for pattern in patterns:
        app_label, codename = pattern.split('.')
        query = Permission.objects.filter(content_type__app_label=app_label)
        if codename != '*':
            query = query.filter(codename=codename)
        perms = perms | query
    return perms.distinct()


def sync_role_groups(**kwargs):
    """Create/update the role groups. Runs after every `migrate`."""
    for role, patterns in ROLE_PERMISSIONS.items():
        group, _ = Group.objects.get_or_create(name=group_name(role))
        group.permissions.set(permissions_for(patterns))


def assign_role_group(user):
    """Put the user in exactly one role group matching user.role."""
    role_groups = Group.objects.filter(name__in=[group_name(r) for r in ROLE_PERMISSIONS])
    user.groups.remove(*role_groups)
    if user.role in ROLE_PERMISSIONS:
        group = Group.objects.filter(name=group_name(user.role)).first()
        if group:
            user.groups.add(group)
