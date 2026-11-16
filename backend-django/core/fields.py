from rest_framework import serializers

from .validators import normalize_phone, validate_indian_phone


class IndianPhoneField(serializers.CharField):
    """
    Accepts '9876543210', '+91 98765 43210', '+91-98765-43210' etc.
    and stores the 10-digit number.
    """

    def __init__(self, **kwargs):
        kwargs.setdefault('max_length', 20)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if not value:
            return value
        if any(ch.isalpha() for ch in value):
            raise serializers.ValidationError('Enter a valid 10-digit Indian mobile number.')
        digits = normalize_phone(value)
        validate_indian_phone(digits)
        return digits
