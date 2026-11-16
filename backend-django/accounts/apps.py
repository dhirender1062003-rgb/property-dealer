from django.apps import AppConfig
from django.db.models.signals import post_migrate, post_save


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'
    verbose_name = 'Users & Roles'

    def ready(self):
        from .roles import assign_role_group, sync_role_groups

        post_migrate.connect(sync_role_groups, dispatch_uid='accounts.sync_role_groups')

        def on_user_saved(sender, instance, **kwargs):
            if not kwargs.get('raw'):
                assign_role_group(instance)

        post_save.connect(on_user_saved, sender=self.get_model('CustomUser'),
                          dispatch_uid='accounts.assign_role_group', weak=False)
