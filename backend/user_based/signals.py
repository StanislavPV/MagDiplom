from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from ratings.models import Rating
from orders.models import Order, OrderItem
from django.core.cache import cache

@receiver(post_save, sender=Rating)
def rating_changed(sender, instance, created, **kwargs):
    cache_key = f'user_recommendations_{instance.user.id}'
    cache.delete(cache_key)

    for key in list(cache._cache.keys()):
        if key.startswith('user_item_matrix_'):
            cache.delete(key)
    action = "created" if created else "updated"
    print(f"Cache cleared for user {instance.user.id} after rating {action}")

@receiver(post_delete, sender=Rating)
def rating_deleted(sender, instance, **kwargs):
    cache_key = f'user_recommendations_{instance.user.id}'
    cache.delete(cache_key)

    for key in list(cache._cache.keys()):
        if key.startswith('user_item_matrix_'):
            cache.delete(key)
    print(f"Cache cleared for user {instance.user.id} after rating deleted")

@receiver(post_save, sender=OrderItem)
def order_item_saved(sender, instance, created, **kwargs):

    if instance.order.is_completed:
        cache_key = f'user_recommendations_{instance.order.user.id}'
        cache.delete(cache_key)
     
        for key in list(cache._cache.keys()):
            if key.startswith('user_item_matrix_'):
                cache.delete(key)
        print(f"Cache cleared for user {instance.order.user.id} after purchase")

@receiver(post_save, sender=Order)
def order_completed(sender, instance, created, **kwargs):
 
    if instance.is_completed:
        cache_key = f'user_recommendations_{instance.user.id}'
        cache.delete(cache_key)
      
        for key in list(cache._cache.keys()):
            if key.startswith('user_item_matrix_'):
                cache.delete(key)
        print(f"Cache cleared for user {instance.user.id} after order completion")