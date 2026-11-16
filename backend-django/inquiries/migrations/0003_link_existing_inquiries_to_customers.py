from django.db import migrations


def link_customers(apps, schema_editor):
    Inquiry = apps.get_model('inquiries', 'Inquiry')
    Customer = apps.get_model('crm', 'Customer')
    for inquiry in Inquiry.objects.filter(customer__isnull=True).order_by('created_at'):
        customer, _ = Customer.objects.get_or_create(
            phone=inquiry.phone, defaults={'name': inquiry.customer_name, 'email': inquiry.email},
        )
        inquiry.customer = customer
        inquiry.save(update_fields=['customer'])


class Migration(migrations.Migration):
    dependencies = [
        ('inquiries', '0002_inquiry_customer_inquiry_follow_up_date_and_more'),
        ('crm', '0001_initial'),
    ]

    operations = [migrations.RunPython(link_customers, migrations.RunPython.noop)]
