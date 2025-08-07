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
    """Serializer for creating orders from cart"""
    
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
        
        # Get user's cart
        try:
            cart = Cart.objects.get(user=user)
            if not cart.items.exists():
                raise serializers.ValidationError("Cart is empty")
        except Cart.DoesNotExist:
            raise serializers.ValidationError("Cart not found")
        
        # Create order
        order = Order.objects.create(
            user=user,
            total_amount=cart.total_price,
            **validated_data
        )
        
        # Create order items from cart
        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                book=cart_item.book,
                quantity=cart_item.quantity,
                unit_price=cart_item.book.price or 0
            )
        
        # Complete the order and clear cart
        order.is_completed = True
        order.completed_at = timezone.now()
        order.save()
        
        # Clear cart
        cart.items.all().delete()
        
        return order


class OrderCreateSingleBookSerializer(serializers.ModelSerializer):
    """Serializer for creating order with single book (buy now) + cart items"""
    book_id = serializers.IntegerField(write_only=True)
    quantity = serializers.IntegerField(write_only=True, default=1)
    
    class Meta:
        model = Order
        fields = [
            'contact_email', 'contact_phone', 'contact_name',
            'delivery_address', 'payment_method', 'card_details',
            'book_id', 'quantity'
        ]
    
    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        if value > 10:
            raise serializers.ValidationError("Maximum quantity is 10")
        return value
    
    def validate_book_id(self, value):
        from books.models import Book
        try:
            book = Book.objects.get(id=value, is_available=True)
            return value
        except Book.DoesNotExist:
            raise serializers.ValidationError("Book not found or not available")
    
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
        from books.models import Book
        
        user = self.context['request'].user
        book_id = validated_data.pop('book_id')
        quantity = validated_data.pop('quantity')
        
        book = Book.objects.get(id=book_id)
        
        # Get cart items
        cart_items = []
        cart_total = 0
        try:
            cart = Cart.objects.get(user=user)
            cart_items = list(cart.items.all())
            cart_total = cart.total_price
        except Cart.DoesNotExist:
            pass
        
        # Calculate total
        buy_now_total = (book.price or 0) * quantity
        total_amount = buy_now_total + cart_total
        
        # Create order
        order = Order.objects.create(
            user=user,
            total_amount=total_amount,
            **validated_data
        )
        
        # Check if the "buy now" book already exists in cart
        existing_cart_item = None
        for cart_item in cart_items:
            if cart_item.book.id == book.id:
                existing_cart_item = cart_item
                break
        
        if existing_cart_item:
            # Merge quantities - create one order item with combined quantity
            OrderItem.objects.create(
                order=order,
                book=book,
                quantity=existing_cart_item.quantity + quantity,
                unit_price=book.price or 0
            )
            # Remove this item from cart_items to avoid duplicate
            cart_items = [item for item in cart_items if item.book.id != book.id]
        else:
            # Create separate order item for "buy now" book
            OrderItem.objects.create(
                order=order,
                book=book,
                quantity=quantity,
                unit_price=book.price or 0
            )
        
        # Add remaining cart items to order
        for cart_item in cart_items:
            OrderItem.objects.create(
                order=order,
                book=cart_item.book,
                quantity=cart_item.quantity,
                unit_price=cart_item.book.price or 0
            )
        
        # Complete the order and clear cart
        order.is_completed = True
        order.completed_at = timezone.now()
        order.save()
        
        # Clear cart if it exists
        if cart_items or existing_cart_item:
            try:
                cart = Cart.objects.get(user=user)
                cart.items.all().delete()
            except Cart.DoesNotExist:
                pass
        
        return order


class OrderUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating order details (before completion)"""
    
    class Meta:
        model = Order
        fields = [
            'contact_email', 'contact_phone', 'contact_name',
            'delivery_address', 'payment_method', 'card_details'
        ]
    
    def validate(self, data):
        if self.instance.is_completed:
            raise serializers.ValidationError("Cannot update completed order")
        return data
    
    def validate_contact_phone(self, value):
        import re
        if not re.match(r'^\d{9}$', value):
            raise serializers.ValidationError("Phone number must be 9 digits")
        return value
    
    def validate_card_details(self, value):
        payment_method = self.initial_data.get('payment_method', self.instance.payment_method)
        if payment_method == 'card' and not value:
            raise serializers.ValidationError("Card details are required for card payment")
        return value


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