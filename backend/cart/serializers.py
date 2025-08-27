from rest_framework import serializers
from .models import Cart, CartItem
from books.serializers import BookCatalogSerializer
from books.models import Book


class CartItemSerializer(serializers.ModelSerializer):
    book_data = BookCatalogSerializer(source='book', read_only=True)
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = CartItem
        fields = ['id', 'book', 'book_data', 'quantity', 'added_at', 'total_price']
        read_only_fields = ['added_at']
    
    def get_total_price(self, obj):
        return obj.total_price


# Серіалайзер для додавання товарів до кошика
class CartItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ['book', 'quantity']
    
    def validate_book(self, value):
        if not value.is_available:
            raise serializers.ValidationError("This book is not available")
        return value
    
    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        if value > 10:  # Set max quantity limit
            raise serializers.ValidationError("Maximum quantity is 10")
        return value
    
    def create(self, validated_data):
        user = self.context['request'].user
        cart, created = Cart.objects.get_or_create(user=user)
        
        book = validated_data['book']
        quantity = validated_data['quantity']
        
        # Перевіряємо чи товар вже є в кошику
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            book=book,
            defaults={'quantity': quantity}
        )
        
        if not created:
            # Товар існує, оновлюємо кількість
            cart_item.quantity += quantity
            cart_item.save()
        
        return cart_item


# Серіалайзер для оновлення кількості товару в кошику
class CartItemUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ['quantity']
    
    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        if value > 10:
            raise serializers.ValidationError("Maximum quantity is 10")
        return value


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_items', 'total_price', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_total_items(self, obj):
        return obj.total_items
    
    def get_total_price(self, obj):
        return obj.total_price