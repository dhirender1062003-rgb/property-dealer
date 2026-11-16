import shutil
import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from .models import City, Locality, Property, PropertyImage

User = get_user_model()
TEMP_MEDIA = tempfile.mkdtemp()


def make_image(name='photo.png', size=(800, 600), fmt='PNG'):
    buffer = BytesIO()
    Image.new('RGB', size, (15, 37, 71)).save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=f'image/{fmt.lower()}')


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class PropertyApiTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)

    def setUp(self):
        # Cities/localities come from the seed migration.
        self.noida = City.objects.get(slug='noida')
        self.ghaziabad = City.objects.get(slug='ghaziabad')
        self.s62 = Locality.objects.get(city=self.noida, slug='sector-62')
        self.indirapuram = Locality.objects.get(city=self.ghaziabad, slug='indirapuram')

        self.admin = User.objects.create_user('admin1', 'admin@example.com', 'S3cure-pass-123', role='admin')
        self.dealer = User.objects.create_user('dealer1', 'dealer@example.com', 'S3cure-pass-123', role='dealer')
        self.staff = User.objects.create_user('staff1', 'staff@example.com', 'S3cure-pass-123', role='staff')
        self.customer = User.objects.create_user('cust1', 'cust@example.com', 'S3cure-pass-123')

        self.flat = Property.objects.create(
            title='3 BHK Flat in Indirapuram', property_type='flat', listing_type='buy', price=11_500_000,
            area=1650, city=self.ghaziabad, locality=self.indirapuram, bedrooms=3, bathrooms=3,
            furnishing_status='semi_furnished', featured=True)
        self.office = Property.objects.create(
            title='Office in Sector 62', property_type='office', listing_type='rent', price=240_000,
            area=3200, city=self.noida, locality=self.s62, bathrooms=4, furnishing_status='fully_furnished')
        self.plot = Property.objects.create(
            title='Plot in Sector 62', property_type='residential_plot', listing_type='buy', price=9_000_000,
            area=200, area_unit='sqyd', city=self.noida, locality=self.s62)
        self.sold = Property.objects.create(
            title='Sold Villa', property_type='villa', listing_type='buy', price=50_000_000, area=4000,
            city=self.noida, status='sold')
        self.draft = Property.objects.create(
            title='Draft Shop', property_type='shop', listing_type='lease', price=50_000, area=300,
            city=self.noida, status='draft')

    def results(self, url):
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200, res.data)
        return [p['slug'] for p in res.data['results']]

    # ---- model behaviour ----
    def test_slug_category_and_area_conversion(self):
        self.assertEqual(self.flat.slug, '3-bhk-flat-in-indirapuram')
        self.assertEqual(self.office.category, 'commercial')
        self.assertEqual(self.plot.category, 'residential')
        self.assertEqual(float(self.plot.area_sqft), 1800.0)  # 200 sq.yd = 1800 sq.ft
        twin = Property.objects.create(title='3 BHK Flat in Indirapuram', property_type='flat', listing_type='buy',
                                       price=1, area=1, city=self.ghaziabad)
        self.assertEqual(twin.slug, '3-bhk-flat-in-indirapuram-2')

    # ---- public list ----
    def test_public_list_hides_sold_and_draft(self):
        slugs = self.results('/api/properties/')
        self.assertCountEqual(slugs, [self.flat.slug, self.office.slug, self.plot.slug])
        res = self.client.get('/api/properties/')
        self.assertEqual(set(res.data), {'count', 'next', 'previous', 'results'})
        card = res.data['results'][0]
        for key in ('price_period', 'city', 'city_name', 'locality_name', 'primary_image', 'is_sample', 'area_sqft'):
            self.assertIn(key, card)

    def test_staff_list_includes_all_statuses(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(len(self.results('/api/properties/')), 5)
        self.assertEqual(self.results('/api/properties/?status=sold'), [self.sold.slug])

    def test_filters(self):
        cases = {
            '?listing_type=rent': [self.office],
            '?city=ghaziabad': [self.flat],
            '?locality=sector-62': [self.office, self.plot],
            '?category=commercial': [self.office],
            '?property_type=flat&property_type=office': [self.flat, self.office],
            '?min_price=5000000&max_price=10000000': [self.plot],
            '?min_area=1700&max_area=2000': [self.plot],
            '?bedrooms=2': [self.flat],
            '?bathrooms=4': [self.office],
            '?furnishing_status=fully_furnished': [self.office],
            '?featured=true': [self.flat],
            '?search=indirapuram': [self.flat],
        }
        for query, expected in cases.items():
            with self.subTest(query=query):
                self.assertCountEqual(self.results(f'/api/properties/{query}'), [p.slug for p in expected])

    def test_invalid_filter_value_returns_400(self):
        self.assertEqual(self.client.get('/api/properties/?listing_type=steal').status_code, 400)

    def test_sorting(self):
        self.assertEqual(self.results('/api/properties/?ordering=price'),
                         [self.office.slug, self.plot.slug, self.flat.slug])
        self.assertEqual(self.results('/api/properties/?ordering=-price')[0], self.flat.slug)
        self.assertEqual(self.results('/api/properties/?ordering=area_sqft'),
                         [self.flat.slug, self.plot.slug, self.office.slug])

    def test_featured_and_latest(self):
        res = self.client.get('/api/properties/featured/')
        self.assertEqual([p['slug'] for p in res.data], [self.flat.slug])
        res = self.client.get('/api/properties/latest/?limit=2')
        self.assertEqual(len(res.data), 2)

    # ---- detail ----
    def test_detail_by_slug_and_id(self):
        res = self.client.get(f'/api/properties/{self.flat.slug}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['title'], self.flat.title)
        self.assertIn('amenities', res.data)
        self.assertIn('images', res.data)
        self.assertEqual(self.client.get(f'/api/properties/{self.flat.id}/').data['slug'], self.flat.slug)
        self.assertEqual(self.client.get('/api/properties/no-such-property/').status_code, 404)

    def test_draft_detail_hidden_from_public(self):
        self.assertEqual(self.client.get(f'/api/properties/{self.draft.slug}/').status_code, 404)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get(f'/api/properties/{self.draft.slug}/').status_code, 200)

    # ---- write permissions ----
    def new_property_payload(self, **extra):
        return {'title': 'New 2 BHK in Sector 62', 'property_type': 'apartment', 'listing_type': 'rent',
                'price': 25000, 'area': '1100', 'city': self.noida.id, 'locality': self.s62.id,
                'bedrooms': 2, **extra}

    def test_create_requires_management_role(self):
        self.assertEqual(self.client.post('/api/properties/', self.new_property_payload()).status_code, 401)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post('/api/properties/', self.new_property_payload()).status_code, 403)
        self.client.force_authenticate(self.staff)
        res = self.client.post('/api/properties/', self.new_property_payload())
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['slug'], 'new-2-bhk-in-sector-62')
        self.assertEqual(res.data['category'], 'residential')
        self.assertEqual(res.data['price_period'], 'month')
        self.assertEqual(Property.objects.get(slug='new-2-bhk-in-sector-62').created_by, self.staff)

    def test_create_validation(self):
        self.client.force_authenticate(self.staff)
        res = self.client.post('/api/properties/', self.new_property_payload(locality=self.indirapuram.id))
        self.assertEqual(res.status_code, 400)
        self.assertIn('locality', res.data)
        res = self.client.post('/api/properties/', self.new_property_payload(price=0))
        self.assertEqual(res.status_code, 400)
        res = self.client.post('/api/properties/', self.new_property_payload(floor=9, total_floors=4))
        self.assertEqual(res.status_code, 400)

    def test_update_and_delete_permissions(self):
        url = f'/api/properties/{self.office.id}/'
        self.client.force_authenticate(self.staff)
        res = self.client.patch(url, {'status': 'rented', 'price': 250000})
        self.assertEqual(res.status_code, 200, res.data)
        self.office.refresh_from_db()
        self.assertEqual((self.office.status, self.office.price), ('rented', 250000))
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.client.force_authenticate(self.dealer)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(Property.objects.filter(pk=self.office.pk).exists())

    # ---- images ----
    def test_image_upload_primary_reorder_and_delete(self):
        url = f'/api/properties/{self.flat.id}/images/'
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post(url, {'images': [make_image()]}, format='multipart').status_code, 403)

        self.client.force_authenticate(self.staff)
        res = self.client.post(url, {'images': [make_image('a.png', (3000, 2000)), make_image('b.jpg', fmt='JPEG')]},
                               format='multipart')
        self.assertEqual(res.status_code, 201, res.data)
        first, second = [PropertyImage.objects.get(pk=i['id']) for i in res.data]
        self.assertTrue(first.is_primary)
        self.assertFalse(second.is_primary)
        self.assertTrue(first.image.name.endswith('.webp'))
        self.assertLessEqual(max(first.image.width, first.image.height), 2000)  # scaled down

        # The card shows the primary photo.
        card = self.client.get('/api/properties/?search=indirapuram').data['results'][0]
        self.assertTrue(card['primary_image'].startswith('http://testserver/media/properties/'))

        # Make the second photo primary.
        res = self.client.patch(f'/api/property-images/{second.id}/', {'is_primary': True})
        self.assertEqual(res.status_code, 200)
        first.refresh_from_db()
        self.assertFalse(first.is_primary)

        # Reorder.
        res = self.client.post(f'{url}reorder/', {'order': [second.id, first.id]}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        res = self.client.post(f'{url}reorder/', {'order': [second.id]}, format='json')
        self.assertEqual(res.status_code, 400)

        # Delete the primary photo: file removed, the other one becomes primary.
        path = second.image.path
        self.assertEqual(self.client.delete(f'/api/property-images/{second.id}/').status_code, 204)
        import os
        self.assertFalse(os.path.exists(path))
        first.refresh_from_db()
        self.assertTrue(first.is_primary)

    def test_image_upload_validation(self):
        url = f'/api/properties/{self.flat.id}/images/'
        self.client.force_authenticate(self.staff)
        fake = SimpleUploadedFile('virus.png', b'not really an image', content_type='image/png')
        self.assertEqual(self.client.post(url, {'images': [fake]}, format='multipart').status_code, 400)
        gif = BytesIO()
        Image.new('RGB', (10, 10)).save(gif, format='GIF')
        gif_file = SimpleUploadedFile('anim.gif', gif.getvalue(), content_type='image/gif')
        self.assertEqual(self.client.post(url, {'images': [gif_file]}, format='multipart').status_code, 400)
        self.assertEqual(self.client.post(url, {}, format='multipart').status_code, 400)
        with self.settings(MAX_IMAGE_UPLOAD_MB=0):
            self.assertEqual(self.client.post(url, {'images': [make_image()]}, format='multipart').status_code, 400)
        self.assertEqual(self.flat.images.count(), 0)


class LocationApiTests(APITestCase):
    def test_cities_with_localities(self):
        res = self.client.get('/api/cities/')
        self.assertEqual(res.status_code, 200)
        names = [c['name'] for c in res.data]
        self.assertEqual(names, ['Ghaziabad', 'Noida', 'Greater Noida'])
        noida = next(c for c in res.data if c['slug'] == 'noida')
        self.assertIn('sector-150', [loc['slug'] for loc in noida['localities']])

    def test_inactive_locations_hidden(self):
        Locality.objects.filter(slug='loni').update(is_active=False)
        res = self.client.get('/api/localities/?city=ghaziabad')
        self.assertNotIn('loni', [loc['slug'] for loc in res.data])
        self.assertIn('indirapuram', [loc['slug'] for loc in res.data])
        res = self.client.get('/api/localities/?city=noida&search=sector 15')
        self.assertIn('Sector 150', [loc['name'] for loc in res.data])

    def test_categories(self):
        res = self.client.get('/api/categories/')
        self.assertEqual([c['value'] for c in res.data], ['residential', 'commercial'])
        self.assertEqual(len(res.data[0]['property_types']), 7)
        self.assertEqual(len(res.data[1]['property_types']), 7)

    def test_amenities(self):
        res = self.client.get('/api/amenities/')
        self.assertEqual(res.status_code, 200)
        self.assertGreater(len(res.data), 10)
