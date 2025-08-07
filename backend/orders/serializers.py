from rest_framework import serializers
from .models import Order, OrderItem
from books.serializers import BookCatalogSerializer
from cart.models import Cart
from django.utils import timezone


class OrderItemSerializer(serializers.ModelSerializer):
    book_data = BookCatalogSerializer(source='book', read_only=True)
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = ['id', 'book', 'book_data', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['unit_price']
    
    def get_total_price(self, obj):
        return obj.total_price


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'contact_email', 'contact_phone', 'contact_name',
            'delivery_address', 'payment_method', 'payment_method_display', 'card_details',
            'total_amount', 'total_items', 'items', 'is_completed', 'created_at', 'completed_at'
        ]
        read_only_fields = ['order_number', 'total_amount', 'is_completed', 'created_at', 'completed_at']
    
    def get_total_items(self, obj):
        return obj.total_items


class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating orders from cart only"""
    
    class Meta:
        model = Order
        fields = [
            'contact_email', 'contact_phone', 'contact_name',
            'delivery_address', 'payment_method', 'card_details'
        ]
    
    def validate_contact_phone(self, value):
        import re
        if not re.match(r'^\d{9}$', value):
            raise serializers.ValidationError("Phone number must be 9 digits")
        return value
    
    def validate_card_details(self, value):
        payment_method = self.initial_data.get('payment_method')
        if payment_method == 'card' and not value:
            raise serializers.ValidationError("Card details are required for card payment")
        return value
    
    def create(self, validated_data):
        user = self.context['request'].user
        
        # Отримуємо кошик користувача
        try:
            cart = Cart.objects.get(user=user)
            if not cart.items.exists():
                raise serializers.ValidationError("Cart is empty")
        except Cart.DoesNotExist:
            raise serializers.ValidationError("Cart not found")
        
        # Створюємо замовлення
        order = Order.objects.create(
            user=user,
            total_amount=cart.total_price,
            **validated_data
        )
        
        # Створюємо елементи замовлення з кошика
        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                book=cart_item.book,
                quantity=cart_item.quantity,
                unit_price=cart_item.book.price or 0
            )
        
        # Завершуємо замовлення та очищуємо кошик
        order.is_completed = True
        order.completed_at = timezone.now()
        order.save()
        
        # Очищуємо кошик
        cart.items.all().delete()
        
        return order


class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for order list view"""
    total_items = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'total_amount', 'total_items',
            'payment_method_display', 'is_completed', 'created_at'
        ]
    
    def get_total_items(self, obj):
        return obj.total_items