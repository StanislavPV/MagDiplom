from django.db import models
from django.contrib.auth import get_user_model
from books.models import Book
import uuid


class Order(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Наложений платіж'),
        ('card', 'Картка'),
    ]
    
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='orders')
    order_number = models.CharField(max_length=20, unique=True, blank=True)
    
    # Contact information (pre-filled from user profile, but editable)
    contact_email = models.EmailField(max_length=255)
    contact_phone = models.CharField(max_length=20)  # Pre-filled from user.phone_number
    contact_name = models.CharField(max_length=255)  # Pre-filled from user.name
    
    # Delivery information
    delivery_address = models.CharField(max_length=255)
    
    # Payment information
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    card_details = models.CharField(max_length=255, blank=True, null=True)  # For card payments
    
    # Order totals
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Order completion
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()
        super().save(*args, **kwargs)

    def generate_order_number(self):
        return f"ORD-{uuid.uuid4().hex[:8].upper()}"

    def __str__(self):
        return f"Order #{self.order_number} by {self.user.name}"

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    class Meta:
        ordering = ['-created_at']


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at time of order

    def save(self, *args, **kwargs):
        # Auto-populate unit price if not provided
        if not self.unit_price:
            self.unit_price = self.book.price or 0
        super().save(*args, **kwargs)

    @property
    def total_price(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.book.title}"