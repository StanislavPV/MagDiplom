from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Avg
from django.core.validators import MinValueValidator, MaxValueValidator


class Genre(models.Model):
    name = models.CharField(max_length=255, unique=True)
    def __str__(self):
        return self.name

class Author(models.Model):
    name = models.CharField(max_length=255, unique=True)
    def __str__(self):
        return self.name

class Book(models.Model):
    title = models.CharField(max_length=255)
    genres = models.ManyToManyField(Genre, related_name='books')
    author = models.ManyToManyField(Author)
    year = models.IntegerField()
    description = models.TextField()
    image = models.ImageField(upload_to='books/', null=True)
    price = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    book_format = models.CharField(max_length=100, blank=True, null=True)
    language = models.CharField(max_length=100, null=True)
    page_count = models.IntegerField(blank=True, null=True)
    cover_type = models.CharField(max_length=100, blank=True, null=True)
    original_name = models.CharField(max_length=100, blank=True, null=True)
    publisher = models.CharField(max_length=100, blank=True, null=True)
    weight = models.DecimalField(max_digits=5, decimal_places=3, null=True)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return self.title

class Wishlist(models.Model):
    user = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='wishlist')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='wishlisted_by')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'book')

    def __str__(self):
        return f'{self.user} wants {self.book}'