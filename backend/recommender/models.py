from django.db import models
from books.models import Book
from django.contrib.auth import get_user_model
from django.core.cache import cache
import pickle
import numpy as np


# Зберігає векторні представлення книг для рекомендаційної системи
class BookVector(models.Model):
    book = models.OneToOneField(Book, related_name='vector', on_delete=models.CASCADE)
    vector = models.BinaryField()

    def __str__(self):
        return f"Vector for {self.book.title}"
    
    def get_vector(self):
        """Отримує вектор з кешу або БД"""
        cache_key = f'book_vector_{self.book_id}'
        cached_vector = cache.get(cache_key)
        
        if cached_vector is not None:
            return cached_vector
        
        # Завантажуємо з БД і кешуємо
        vector = pickle.loads(self.vector)
        cache.set(cache_key, vector, timeout=3600)  # 1 година
        return vector
    
    def save(self, *args, **kwargs):
        """Очищає кеш при збереженні"""
        super().save(*args, **kwargs)
        cache_key = f'book_vector_{self.book_id}'
        cache.delete(cache_key)
    
    def delete(self, *args, **kwargs):
        """Очищає кеш при видаленні"""
        cache_key = f'book_vector_{self.book_id}'
        cache.delete(cache_key)
        super().delete(*args, **kwargs)