from django.utils.text import slugify


def unique_slug(instance, value, queryset=None, max_length=200, fallback='item'):
    """
    Build a URL slug from `value` that is unique within `queryset`
    (defaults to all rows of the instance's model), adding -2, -3, ... if needed.
    Purely numeric slugs are prefixed so they can never be confused with an id.
    """
    base = slugify(value)[: max_length - 10].strip('-') or fallback
    if base.isdigit():
        base = f'{fallback}-{base}'
    if queryset is None:
        queryset = type(instance)._default_manager.all()
    if instance.pk:
        queryset = queryset.exclude(pk=instance.pk)

    slug, n = base, 2
    while queryset.filter(slug=slug).exists():
        slug = f'{base}-{n}'
        n += 1
    return slug
