from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import PropertyImage


@receiver(post_delete, sender=PropertyImage)
def cleanup_property_image(sender, instance, **kwargs):
    # Remove the file from disk so deleted photos don't pile up.
    if instance.image:
        instance.image.storage.delete(instance.image.name)
    # If the main photo was deleted, promote the next one.
    if instance.is_primary:
        remaining = PropertyImage.objects.filter(property_id=instance.property_id)
        if not remaining.filter(is_primary=True).exists():
            next_image = remaining.order_by('display_order', 'id').first()
            if next_image:
                PropertyImage.objects.filter(pk=next_image.pk).update(is_primary=True)
