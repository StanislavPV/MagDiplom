from django.apps import AppConfig


class UserBasedConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'user_based'

    def ready(self):
        import user_based.signals