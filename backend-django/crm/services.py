from .models import Customer


def get_or_create_customer(name, phone, email=''):
    """
    Find the customer with this (normalised, 10-digit) phone number or create
    one. An existing customer's missing email is filled in; their name is kept.
    """
    customer, created = Customer.objects.get_or_create(phone=phone, defaults={'name': name, 'email': email or ''})
    if not created and email and not customer.email:
        customer.email = email
        customer.save(update_fields=['email', 'updated_at'])
    return customer
