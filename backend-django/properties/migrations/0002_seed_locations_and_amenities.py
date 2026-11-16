"""
Initial cities, localities and amenities. These are ordinary database rows:
add, rename, hide (is_active) or delete them any time in Django admin.
"""

from django.db import migrations
from django.utils.text import slugify

LOCATIONS = {
    'Ghaziabad': {
        'description': 'Indirapuram, Vaishali, Raj Nagar Extension, Crossings Republik and all of Ghaziabad.',
        'localities': [
            'Raj Nagar', 'RDC Raj Nagar', 'Kavi Nagar', 'Raj Nagar Extension', 'Indirapuram', 'Vaishali',
            'Vasundhara', 'Sahibabad', 'Crossings Republik', 'Sanjay Nagar', 'Shastri Nagar', 'Govindpuram',
            'Kaushambi', 'Mohan Nagar', 'Loni', 'Modinagar', 'Muradnagar', 'Dasna', 'Wave City', 'NH-24',
            'Other Ghaziabad areas',
        ],
    },
    'Noida': {
        'description': 'All Noida sectors from Sector 1 to Sector 150, including the Noida Expressway.',
        'localities': ['Noida Expressway'] + [f'Sector {n}' for n in range(1, 151)] + ['Other Noida locations'],
    },
    'Greater Noida': {
        'description': 'Greater Noida, Greater Noida West (Noida Extension), Techzone, Gaur City and more.',
        'localities': [
            'Alpha', 'Beta', 'Gamma', 'Delta', 'Knowledge Park', 'Pari Chowk', 'Jaypee Greens', 'Omicron',
            'Zeta', 'Chi', 'Pi', 'Greater Noida West', 'Noida Extension', 'Techzone', 'Gaur City',
            'Other Greater Noida locations',
        ],
    },
}

AMENITIES = [
    ('Lift', 'arrow-up-down'), ('Power Backup', 'zap'), ('24x7 Security', 'shield-check'), ('CCTV', 'cctv'),
    ('Covered Parking', 'car'), ('Visitor Parking', 'square-parking'), ('Park', 'trees'),
    ('Club House', 'house'), ('Gym', 'dumbbell'), ('Swimming Pool', 'waves'), ('Kids Play Area', 'baby'),
    ('Gated Community', 'door-closed'), ('Intercom', 'phone'), ('Rainwater Harvesting', 'droplets'),
    ('24x7 Water Supply', 'droplet'), ('Fire Safety', 'flame'), ('Modular Kitchen', 'cooking-pot'),
    ('Servant Room', 'bed-single'), ('Private Terrace', 'sun'), ('Private Garden', 'flower-2'),
    ('Private Pool', 'waves'), ('Home Lift', 'arrow-up-down'), ('Smart Home', 'cpu'),
    ('Vastu Compliant', 'compass'), ('Central AC', 'air-vent'), ('Conference Room', 'presentation'),
    ('Cafeteria / Pantry', 'coffee'), ('Main Road Facing', 'signpost'), ('Loading Dock', 'truck'),
    ('Wide Roads', 'route'),
]


def seed(apps, schema_editor):
    City = apps.get_model('properties', 'City')
    Locality = apps.get_model('properties', 'Locality')
    Amenity = apps.get_model('properties', 'Amenity')

    for city_order, (city_name, data) in enumerate(LOCATIONS.items()):
        city, _ = City.objects.get_or_create(
            slug=slugify(city_name),
            defaults={'name': city_name, 'description': data['description'], 'display_order': city_order},
        )
        for order, name in enumerate(data['localities']):
            Locality.objects.get_or_create(
                city=city, slug=slugify(name), defaults={'name': name, 'display_order': order},
            )

    for order, (name, icon) in enumerate(AMENITIES):
        Amenity.objects.get_or_create(name=name, defaults={'icon': icon, 'display_order': order})


class Migration(migrations.Migration):
    dependencies = [('properties', '0001_initial')]

    # Reversing leaves the rows in place; delete them in admin if needed.
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
