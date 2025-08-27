from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Cart, CartItem
from .serializers import (
    CartSerializer, 
    CartItemSerializer, 
    CartItemCreateSerializer, 
    CartItemUpdateSerializer
)
from books.models import Book


# Отримує кошик користувача з усіма товарами
class CartView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        return cart


# Додає товар до кошика або оновлює кількість
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    serializer = CartItemCreateSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        cart_item = serializer.save()
        return Response({
            'message': 'Item added to cart successfully',
            'cart_item': CartItemSerializer(cart_item).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Оновлює кількість товару в кошику
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_cart_item(request, item_id):
    try:
        cart = Cart.objects.get(user=request.user)
        cart_item = CartItem.objects.get(id=item_id, cart=cart)
    except (Cart.DoesNotExist, CartItem.DoesNotExist):
        return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = CartItemUpdateSerializer(cart_item, data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Cart item updated successfully',
            'cart_item': CartItemSerializer(cart_item).data
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Видаляє товар з кошика
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, item_id):
    try:
        cart = Cart.objects.get(user=request.user)
        cart_item = CartItem.objects.get(id=item_id, cart=cart)
    except (Cart.DoesNotExist, CartItem.DoesNotExist):
        return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)
    
    cart_item.delete()
    return Response({'message': 'Item removed from cart'}, status=status.HTTP_204_NO_CONTENT)


# Очищає всі товари з кошика
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_cart(request):
    try:
        cart = Cart.objects.get(user=request.user)
        cart.items.all().delete()
        return Response({'message': 'Cart cleared successfully'}, status=status.HTTP_204_NO_CONTENT)
    except Cart.DoesNotExist:
        return Response({'message': 'Cart is already empty'}, status=status.HTTP_200_OK)


# Отримує підсумок кошика (загальна кількість та ціна)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cart_summary(request):
    try:
        cart = Cart.objects.get(user=request.user)
        return Response({
            'total_items': cart.total_items,
            'total_price': cart.total_price,
            'items_count': cart.items.count()
        })
    except Cart.DoesNotExist:
        return Response({
            'total_items': 0,
            'total_price': 0,
            'items_count': 0
        })