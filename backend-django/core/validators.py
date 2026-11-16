from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, RegexValidator

ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

validate_image_extension = FileExtensionValidator(ALLOWED_IMAGE_EXTENSIONS)

# Indian mobile number: optional +91, then 10 digits starting with 6-9.
validate_indian_phone = RegexValidator(
    r'^(\+91[\-\s]?)?[6-9]\d{9}$',
    'Enter a valid 10-digit Indian mobile number.',
)

# WhatsApp number in international format, digits only (e.g. 919876543210).
validate_whatsapp_number = RegexValidator(
    r'^\+?\d{10,15}$',
    'Enter the WhatsApp number with country code, digits only (e.g. 919876543210).',
)


def validate_image_size(file):
    limit_mb = settings.MAX_IMAGE_UPLOAD_MB
    if file.size > limit_mb * 1024 * 1024:
        raise ValidationError(f'Image is too large. The maximum size is {limit_mb} MB.')


def normalize_phone(value):
    """Store phone numbers as 10 digits (strip +91, spaces and dashes)."""
    digits = ''.join(ch for ch in str(value) if ch.isdigit())
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    return digits
