from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import BookVector
from books.models import Book


@receiver(post_save, sender=BookVector)
def clear_vector_cache_on_save(sender, instance, **kwargs):
    """Очищає кеш вектора при збереженні"""
    cache_key = f'book_vector_{instance.book_id}'
    cache.delete(cache_key)
    
    # Очищаємо кеш рекомендацій
    clear_recommendations_cache()
    print(f"Cleared vector cache for book {instance.book_id}")


@receiver(post_delete, sender=BookVector)
def clear_vector_cache_on_delete(sender, instance, **kwargs):
    """Очищає кеш вектора при видаленні"""
    cache_key = f'book_vector_{instance.book_id}'
    cache.delete(cache_key)
    
    # Очищаємо кеш рекомендацій
    clear_recommendations_cache()
    print(f"Cleared vector cache for deleted book {instance.book_id}")


@receiver(post_save, sender=Book)
def clear_cache_on_book_update(sender, instance, **kwargs):
    """Очищає кеш при оновленні книги"""
    if kwargs.get('update_fields') and any(field in ['is_available', 'stock', 'average_rating'] 
                                          for field in kwargs['update_fields']):
        clear_recommendations_cache()
        print(f"Cleared recommendations cache due to book {instance.id} update")


def clear_recommendations_cache():
    """Очищає всі кеші рекомендацій"""
    # Отримуємо всі ключі кешу, що починаються з 'content_rec_'
    cache_keys = []
    try:
        # Для локального кешу Django
        if hasattr(cache, '_cache'):
            cache_keys = [key for key in cache._cache.keys() if key.startswith('content_rec_')]
        
        for key in cache_keys:
            cache.delete(key)
            
        print(f"Cleared {len(cache_keys)} recommendation cache entries")
    except Exception as e:
        print(f"Error clearing recommendation cache: {e}")