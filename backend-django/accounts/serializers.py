import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from core.fields import IndianPhoneField

User = get_user_model()
logger = logging.getLogger('accounts.auth')


class UserSerializer(serializers.ModelSerializer):
    is_management = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'role', 'is_management', 'date_joined']
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    """Public sign-up. New accounts are always customers."""

    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    phone = IndianPhoneField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'phone', 'password']
        extra_kwargs = {'email': {'required': True}}

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate(self, attrs):
        candidate = User(**{k: v for k, v in attrs.items() if k != 'password'})
        validate_password(attrs['password'], user=candidate)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data, role=User.Role.CUSTOMER)
        user.set_password(password)
        user.save()
        return user

    def to_representation(self, instance):
        return UserSerializer(instance).data


def resolve_login(login):
    """
    The account a login name refers to: an email (any case) or a username
    (exact match first, then case-insensitive). None if there is no account.
    """
    login = (login or '').strip()
    if not login:
        return None
    if '@' in login:
        return User.objects.filter(email__iexact=login).first()
    return User.objects.filter(username=login).first() or User.objects.filter(username__iexact=login).first()


def login_failure_reason(user, password):
    """Why a login was refused, for the server log only (never sent to the browser)."""
    if user is None:
        return 'no account with this username or email'
    if not user.is_active:
        return 'account is inactive'
    if not user.has_usable_password():
        return 'account has no password set'
    if not user.check_password(password):
        return 'wrong password'
    return 'rejected by an authentication backend'


class LoginSerializer(TokenObtainPairSerializer):
    """
    Log in with username OR email. The token carries the user's role so the
    Node.js server can check it without calling Django.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # DRF trims spaces by default, but Django stores passwords exactly as
        # typed (createsuperuser, changepassword, admin). Trimming here would
        # reject a correct password that starts or ends with a space.
        self.fields['password'].trim_whitespace = False

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = user.role
        token['is_management'] = user.is_management
        return token

    def validate(self, attrs):
        login = attrs.get(self.username_field, '')
        match = resolve_login(login)
        if match:
            attrs[self.username_field] = match.username
        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            # Shown in the Django terminal so a failed login can be diagnosed.
            logger.warning('Dashboard login refused for %r: %s', login.strip()[:150],
                           login_failure_reason(match, attrs.get('password', '')))
            raise
        data['user'] = UserSerializer(self.user).data
        return data
