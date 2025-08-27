from django.db import models
from django.contrib.auth import get_user_model
from books.models import Book


# Зберігає кошик покупок користувача
class Cart(models.Model):
    user = models.OneToOneField(
        get_user_model(), 
        on_delete=models.CASCADE, 
        related_name='cart'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user.name}"

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def total_price(self):
        return sum(item.total_price for item in self.items.all())


# Зберігає окремі товари в кошику
class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'book')

    def __str__(self):
        return f"{self.quantity}x {self.book.title}"

    @property
    def total_price(self):
        return self.quantity * (self.book.price or 0)