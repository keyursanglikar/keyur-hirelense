from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models

class User(AbstractBaseUser):
    # Minimal fields for Hirelens foreign keys to work
    email = models.EmailField(unique=True)
    
    USERNAME_FIELD = 'email'
    
    class Meta:
        db_table = 'users'
        managed = False
