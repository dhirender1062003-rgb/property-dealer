# Property Dealer Website

One responsive website (phones, tablets, laptops, desktops) built from three independent applications:

| Folder            | What it is                                                     | Runs on                 |
|-------------------|----------------------------------------------------------------|-------------------------|
| `frontend/`       | React website (Vite)                                           | http://localhost:5173   |
| `backend-django/` | Django REST API + Django Admin: properties, users, enquiries    | http://localhost:8000   |
| `backend-node/`   | Node.js + Socket.IO: notifications, live chat (Phase 5)        | http://localhost:5000   |

## First-time setup

Each app reads its settings from its own `.env` file. If a `.env` is missing,
copy `.env.example` to `.env` and fill in the values. `JWT_SECRET` must be the
same in `backend-django/.env` and `backend-node/.env`.

```powershell
# Django
cd backend-django
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\python manage.py migrate          # creates tables, cities, localities, amenities
.\venv\Scripts\python manage.py createsuperuser  # your admin login

# Optional (development only): 16 demo listings marked "Sample"
.\venv\Scripts\python manage.py load_demo_properties
# Remove them again:
.\venv\Scripts\python manage.py load_demo_properties --remove

# Node
cd ..\backend-node
npm install

# React
cd ..\frontend
npm install
```

## Running (one terminal each)

```powershell
cd backend-django; .\venv\Scripts\python manage.py runserver 8000
cd backend-node;   npm run dev
cd frontend;       npm run dev
```

- Website: http://localhost:5173
- CRM Dashboard: http://localhost:5173/dashboard (log in with an Admin, Dealer or Staff account)
- Django Admin (technical back-office): http://localhost:8000/admin/

## Dashboard roles

| Role | Can do |
|---|---|
| Admin | Everything, including Website Settings and deleting leads/customers |
| Dealer | Properties (incl. delete), leads, customers, site visits (incl. delete), locations |
| Staff | Add/edit properties and photos, manage leads, customers and site visits; view locations |
| Customer | No dashboard access |

Create staff accounts in Django Admin → Users (choose the role), or with `createsuperuser` for an admin.

Login trouble? Check a login without changing anything (the password is typed into a hidden prompt):
`.\venv\Scripts\python manage.py check_login <username or email>`. Refused dashboard logins are also
logged with the reason (never the password) in the terminal running Django.
- On a phone on the same Wi-Fi: `npm run dev -- --host` and open the printed Network URL
  (also add that address to `CORS_ALLOWED_ORIGINS` and `VITE_DJANGO_API_URL`).

## Tests

```powershell
cd backend-django; .\venv\Scripts\python manage.py test
cd frontend;       npm run lint; npm run build
```

## Main API endpoints (Django, prefix `/api/`)

| Method | Endpoint | Who |
|---|---|---|
| GET | `properties/` (filters: `listing_type, category, property_type, city, locality, min_price, max_price, min_area, max_area, bedrooms, bathrooms, furnishing_status, featured, search, ordering, page, page_size`) | Public |
| GET | `properties/featured/`, `properties/latest/`, `properties/<slug or id>/` | Public |
| POST / PUT / PATCH | `properties/`, `properties/<id>/` | Admin, Dealer, Staff |
| DELETE | `properties/<id>/` | Admin, Dealer |
| POST | `properties/<id>/images/` (multipart `images`), `properties/<id>/images/reorder/` | Admin, Dealer, Staff |
| PATCH / DELETE | `property-images/<id>/` | Admin, Dealer, Staff |
| GET | `cities/`, `localities/?city=`, `categories/`, `amenities/` | Public |
| POST | `inquiries/` (rate limited, spam-protected) | Public |
| GET / PATCH | `inquiries/`, `inquiries/<id>/` | Admin, Dealer, Staff |
| GET / PATCH | `site-settings/` | Public read / Admin update |
| GET | `dashboard/stats/`, `team/` | Admin, Dealer, Staff |
| CRUD | `customers/` (delete: Admin), `site-visits/` (delete: Admin, Dealer) | Admin, Dealer, Staff |
| POST / PATCH / DELETE | `cities/`, `localities/` | Admin, Dealer |
| POST | `auth/login/`, `auth/refresh/`, `auth/register/`; GET `auth/me/` | Public / logged in |

## Production notes

- Set `DJANGO_DEBUG=False`, real `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`.
- PostgreSQL: set `DATABASE_URL=postgres://user:pass@host:5432/dbname` (driver `psycopg` is installed).
- Set `VITE_USE_SAMPLE_DATA=false` in the frontend build environment.
