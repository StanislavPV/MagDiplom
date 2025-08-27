from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import re
from django.core.exceptions import ValidationError

# Менеджер для роботи з користувачами
class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('User must have an email address')
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        
        return user
    
    def create_superuser(self, email, password):
        user = self.create_user(email, password)
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        
        return user


# Кастомна модель користувача з email як основним ідентифікатором
class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=9, null=True)  
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    
    @property
    def full_phone_number(self):
        return f'380{self.phone_number}'

    def clean(self):
        if self.phone_number:
            if not re.match(r'^\d{9}$', self.phone_number):
                raise ValidationError("Phone number must be 9 digits (without country code).")