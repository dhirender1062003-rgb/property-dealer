"""
Development helper: load clearly-marked demo listings (is_demo=True, shown
with a "Sample" label on the website).

    python manage.py load_demo_properties            # add demo listings + photos
    python manage.py load_demo_properties --no-images
    python manage.py load_demo_properties --remove   # delete all demo listings

Refuses to run when DEBUG is False unless --force is given.
"""

import urllib.request
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from properties.models import Amenity, City, Locality, Property, PropertyImage

PHOTO = 'https://images.unsplash.com/photo-{}?auto=format&fit=crop&w=1400&q=80'
IMG = {
    'tower1': '1545324418-cc1a3fa10c00', 'tower2': '1574362848149-11496d93a7c7', 'tower3': '1460317442991-0ec209397118',
    'living1': '1560448204-e02f11c3d0e2', 'living2': '1522708323590-d24dbb6b0267', 'living3': '1493809842364-78817add7ffb',
    'livingLux': '1600607687939-ce8a6c25118c', 'kitchen': '1484154218962-a197022b5858',
    'bed1': '1505693416388-ac5ce068fe85', 'bed2': '1616594039964-ae9021a400a0',
    'villa1': '1613977257363-707ba9348227', 'villa2': '1600596542815-ffad4c1539a9', 'villa3': '1582268611958-ebfd161ef9cf',
    'house1': '1600047509807-ba8f99d2cdde', 'house2': '1600566753190-17f0baa2a6c3', 'plot': '1500382017468-9049fed747ef',
    'officeTower': '1486406146926-c627a92ad1ab', 'office1': '1497366811353-6870744d04b2',
    'office2': '1497215728101-856f4ea42174', 'openSpace': '1497366216548-37526070297c',
    'store1': '1441986300917-64674bd600d8', 'store2': '1555529669-e69e7aa0ba9a', 'store3': '1604719312566-8912e9227c6a',
    'warehouse1': '1553413077-190dd305871c', 'warehouse2': '1586528116311-ad8dd3c8310d',
}
SOCIETY = ['Lift', 'Power Backup', '24x7 Security', 'CCTV', 'Covered Parking', 'Park', 'Club House', 'Gym',
           'Swimming Pool', 'Kids Play Area']
COMMERCIAL = ['Power Backup', 'Lift', '24x7 Security', 'CCTV', 'Visitor Parking', 'Fire Safety']

DEMO = [
    dict(title='3 BHK Flat in Indirapuram', listing_type='buy', property_type='flat', city='ghaziabad',
         locality='indirapuram', address='Shakti Khand, Indirapuram', price=11500000, area=1650, bedrooms=3,
         bathrooms=3, balconies=2, furnishing_status='semi_furnished', facing='East', floor=7, total_floors=14,
         parking=1, possession_status='ready', property_age='5-10 years', featured=True, amenities=SOCIETY,
         images=['tower1', 'living1', 'kitchen', 'bed1'],
         description='A spacious east-facing 3 BHK on the 7th floor of a well-maintained gated society, close to NH-24, schools and malls.'),
    dict(title='2 BHK Apartment for Rent in Vaishali', listing_type='rent', property_type='apartment',
         city='ghaziabad', locality='vaishali', address='Sector 4, Vaishali', price=24000, area=1150, bedrooms=2,
         bathrooms=2, balconies=1, furnishing_status='semi_furnished', facing='North', floor=4, total_floors=12,
         parking=1, possession_status='ready', amenities=SOCIETY[:6], images=['tower2', 'living2', 'bed2'],
         description='Semi-furnished 2 BHK with wardrobes and modular kitchen, a short walk from Vaishali Metro.'),
    dict(title='200 Sq.Yd Residential Plot in Raj Nagar Extension', listing_type='buy',
         property_type='residential_plot', city='ghaziabad', locality='raj-nagar-extension', price=7200000,
         area=200, area_unit='sqyd', facing='North-East', amenities=['Gated Community', 'Wide Roads'],
         images=['plot'], description='North-east facing plot in a developed gated colony with wide internal roads.'),
    dict(title='4 BHK Builder Floor in Kavi Nagar', listing_type='buy', property_type='builder_floor',
         city='ghaziabad', locality='kavi-nagar', price=16500000, area=2100, bedrooms=4, bathrooms=4, balconies=2,
         furnishing_status='semi_furnished', facing='East', floor=1, total_floors=4, parking=1,
         possession_status='ready', property_age='0-1 years', featured=True,
         amenities=['Power Backup', 'Covered Parking', 'Modular Kitchen', 'Lift'], images=['house1', 'livingLux', 'bed2'],
         description='Brand-new first-floor builder floor with stilt parking, lift and premium fittings.'),
    dict(title='Furnished Office for Rent in Kaushambi', listing_type='rent', property_type='office',
         city='ghaziabad', locality='kaushambi', price=110000, area=1800, bathrooms=2,
         furnishing_status='fully_furnished', floor=5, total_floors=10, parking=3, possession_status='ready',
         amenities=COMMERCIAL + ['Conference Room', 'Cafeteria / Pantry'], images=['office1', 'office2'],
         description='Plug-and-play office with 28 workstations, two cabins and a conference room.'),
    dict(title='Showroom for Lease on NH-24', listing_type='lease', property_type='showroom', city='ghaziabad',
         locality='nh-24', price=220000, area=2400, bathrooms=2, furnishing_status='unfurnished',
         facing='Main Road', floor=0, total_floors=4, parking=6, possession_status='ready',
         amenities=COMMERCIAL + ['Main Road Facing'], images=['openSpace', 'store1'],
         description='Double-height ground floor showroom with wide glass frontage on the highway.'),
    dict(title='5 BHK Luxury Villa in Sector 150', listing_type='buy', property_type='villa', city='noida',
         locality='sector-150', price=65000000, area=4800, bedrooms=5, bathrooms=6, balconies=4,
         furnishing_status='fully_furnished', facing='North-East', total_floors=3, parking=3,
         possession_status='ready', property_age='0-1 years', featured=True,
         amenities=['Private Pool', 'Home Lift', 'Private Garden', 'Smart Home', 'Servant Room', '24x7 Security'],
         images=['villa1', 'villa2', 'livingLux', 'bed1'],
         description='Architect-designed villa with private pool, home lift and smart-home automation near the Expressway.'),
    dict(title='3 BHK Apartment in Sector 137', listing_type='buy', property_type='apartment', city='noida',
         locality='sector-137', price=13200000, area=1550, bedrooms=3, bathrooms=3, balconies=3,
         furnishing_status='semi_furnished', facing='East', floor=12, total_floors=25, parking=1,
         possession_status='ready', property_age='1-5 years', featured=True, amenities=SOCIETY,
         images=['tower3', 'living1', 'kitchen'], description='High-floor 3 BHK on the Noida Expressway close to the metro.'),
    dict(title='Retail Shop for Lease in Sector 18', listing_type='lease', property_type='shop', city='noida',
         locality='sector-18', price=150000, area=450, bathrooms=1, furnishing_status='unfurnished', floor=0,
         total_floors=3, possession_status='ready', featured=True, amenities=['Main Road Facing', 'Power Backup'],
         images=['store1', 'store2'], description='Ground floor shop in the busy Sector 18 market.'),
    dict(title='Corporate Office for Rent in Sector 62', listing_type='rent', property_type='office', city='noida',
         locality='sector-62', price=240000, area=3200, bathrooms=4, furnishing_status='fully_furnished', floor=6,
         total_floors=12, parking=8, possession_status='ready',
         amenities=COMMERCIAL + ['Conference Room', 'Central AC'], images=['officeTower', 'office1', 'office2'],
         description='Fully furnished IT office with 50 workstations, near Sector 62 Metro.'),
    dict(title='3 BHK Flat for Rent in Sector 75', listing_type='rent', property_type='flat', city='noida',
         locality='sector-75', price=32000, area=1450, bedrooms=3, bathrooms=2, balconies=2,
         furnishing_status='unfurnished', facing='East', floor=10, total_floors=20, parking=1,
         possession_status='ready', amenities=SOCIETY, images=['tower2', 'living3'],
         description='3 BHK in a society with full amenities, a short walk from the metro.'),
    dict(title='Warehouse for Lease in Sector 63', listing_type='lease', property_type='warehouse', city='noida',
         locality='sector-63', price=600000, area=12000, floor=0, total_floors=1, parking=4,
         possession_status='ready', amenities=['Loading Dock', 'Fire Safety', '24x7 Security'], images=['warehouse1'],
         description='Warehouse with 24-foot clear height, loading dock and truck access.'),
    dict(title='4 BHK Villa in Chi', listing_type='buy', property_type='villa', city='greater-noida',
         locality='chi', price=32500000, area=3600, bedrooms=4, bathrooms=5, balconies=3,
         furnishing_status='semi_furnished', facing='North', total_floors=2, parking=2, possession_status='ready',
         featured=True, amenities=['Swimming Pool', 'Private Garden', 'Gated Community', 'Club House'],
         images=['villa3', 'livingLux'], description='Modern villa in a gated villa community close to Pari Chowk.'),
    dict(title='2 BHK Apartment for Rent in Knowledge Park', listing_type='rent', property_type='apartment',
         city='greater-noida', locality='knowledge-park', price=16000, area=980, bedrooms=2, bathrooms=2,
         furnishing_status='semi_furnished', floor=3, total_floors=14, parking=1, possession_status='ready',
         amenities=SOCIETY[:6], images=['tower3', 'bed2'], description='Affordable 2 BHK close to universities.'),
    dict(title='2 BHK Flat in Noida Extension', listing_type='buy', property_type='flat', city='greater-noida',
         locality='noida-extension', price=6200000, area=1025, bedrooms=2, bathrooms=2, balconies=2,
         furnishing_status='unfurnished', facing='East', floor=11, total_floors=22, parking=1,
         possession_status='ready', amenities=SOCIETY, images=['tower2', 'living2'],
         description='Ready-to-move 2 BHK in a large society with club house and pool.'),
    dict(title='Industrial Shed for Lease in Techzone', listing_type='lease', property_type='industrial',
         city='greater-noida', locality='techzone', price=450000, area=1, area_unit='acre', parking=6,
         possession_status='ready', amenities=['Loading Dock', 'Power Backup', 'Fire Safety'], images=['warehouse2'],
         description='One-acre industrial plot with a built-up shed and heavy power connection.'),
]


def fetch(key):
    request = urllib.request.Request(PHOTO.format(IMG[key]), headers={'User-Agent': 'PropertyDealerDemo/1.0'})
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            return key, response.read()
    except Exception:
        return key, None


class Command(BaseCommand):
    help = 'Load (or --remove) demo property listings for development.'

    def add_arguments(self, parser):
        parser.add_argument('--remove', action='store_true', help='Delete all demo listings and their photos.')
        parser.add_argument('--no-images', action='store_true', help='Do not download demo photos.')
        parser.add_argument('--force', action='store_true', help='Allow running when DEBUG is False.')

    def handle(self, *args, **options):
        if not settings.DEBUG and not options['force']:
            raise CommandError('Demo data is for development only (DEBUG is False). Use --force to override.')

        if options['remove']:
            demo = Property.objects.filter(is_demo=True)
            count = demo.count()
            for prop in demo:
                for image in prop.images.all():
                    image.delete()  # also removes the file from disk
            demo.delete()
            self.stdout.write(self.style.SUCCESS(f'Removed {count} demo listings.'))
            return

        photos = {}
        if not options['no_images']:
            keys = sorted({k for item in DEMO for k in item['images']})
            self.stdout.write(f'Downloading {len(keys)} demo photos...')
            with ThreadPoolExecutor(max_workers=6) as pool:
                photos = {k: data for k, data in pool.map(fetch, keys) if data}
            self.stdout.write(f'  {len(photos)} of {len(keys)} photos downloaded.')

        amenities = {a.name: a for a in Amenity.objects.all()}
        created = skipped = 0
        for item in DEMO:
            data = dict(item)
            image_keys = data.pop('images')
            amenity_names = data.pop('amenities')
            city = City.objects.get(slug=data.pop('city'))
            locality = Locality.objects.filter(city=city, slug=data.pop('locality')).first()
            if Property.objects.filter(title=data['title'], is_demo=True).exists():
                skipped += 1
                continue
            with transaction.atomic():
                prop = Property.objects.create(
                    **{**data, 'area': Decimal(str(data['area']))}, city=city, locality=locality, is_demo=True,
                )
                prop.amenities.set([amenities[n] for n in amenity_names if n in amenities])
                for order, key in enumerate(image_keys):
                    if key in photos:
                        PropertyImage.objects.create(
                            property=prop, display_order=order, alt_text=f'{prop.title} - photo {order + 1}',
                            image=ContentFile(photos[key], name=f'{key}.jpg'),
                        )
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Created {created} demo listings ({skipped} already existed). Remove them with --remove.'))
