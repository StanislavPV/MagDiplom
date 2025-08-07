from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Order, OrderItem
from .serializers import (
    OrderSerializer, 
    OrderCreateSerializer, 
    OrderCreateSingleBookSerializer,
    OrderUpdateSerializer,
    OrderListSerializer
)
from cart.models import Cart


class OrderListView(generics.ListAPIView):
    """List user's orders"""
    serializer_class = OrderListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    """Get order details"""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order_from_cart(request):
    """Create order from user's cart"""
    # Pre-fill contact information from user profile
    user = request.user
    order_data = request.data.copy()
    
    # Pre-fill with user data if not provided
    if not order_data.get('contact_email'):
        order_data['contact_email'] = user.email
    if not order_data.get('contact_name'):
        order_data['contact_name'] = user.name
    if not order_data.get('contact_phone'):
        order_data['contact_phone'] = user.phone_number or ''
    
    serializer = OrderCreateSerializer(data=order_data, context={'request': request})
    
    if serializer.is_valid():
        order = serializer.save()
        return Response({
            'message': 'Дякуємо за замовлення! Ваше замовлення успішно оформлено.',
            'order': OrderSerializer(order).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_single_book_order(request):
    """Create order for a single book (buy now)"""
    # Pre-fill contact information from user profile
    user = request.user
    order_data = request.data.copy()
    
    # Pre-fill with user data if not provided
    if not order_data.get('contact_email'):
        order_data['contact_email'] = user.email
    if not order_data.get('contact_name'):
        order_data['contact_name'] = user.name
    if not order_data.get('contact_phone'):
        order_data['contact_phone'] = user.phone_number or ''
    
    serializer = OrderCreateSingleBookSerializer(data=order_data, context={'request': request})
    
    if serializer.is_valid():
        order = serializer.save()
        return Response({
            'message': 'Дякуємо за замовлення! Ваше замовлення успішно оформлено.',
            'order': OrderSerializer(order).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_order(request, order_id):
    """Update order details (only before completion)"""
    try:
        order = Order.objects.get(id=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if order.is_completed:
        return Response({'error': 'Cannot update completed order'}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = OrderUpdateSerializer(order, data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Order updated successfully',
            'order': OrderSerializer(order).data
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    """Cancel order (only if not completed)"""
    try:
        order = Order.objects.get(id=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if order.is_completed:
        return Response({'error': 'Cannot cancel completed order'}, status=status.HTTP_400_BAD_REQUEST)
    
    order.delete()
    return Response({'message': 'Order cancelled successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_data_for_order(request):
    """Get user data to pre-fill order form"""
    user = request.user
    return Response({
        'contact_email': user.email,
        'contact_name': user.name,
        'contact_phone': user.phone_number or '',
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_statistics(request):
    """Get user's order statistics"""
    user_orders = Order.objects.filter(user=request.user)
    
    total_orders = user_orders.count()
    completed_orders = user_orders.filter(is_completed=True).count()
    total_spent = sum(order.total_amount for order in user_orders.filter(is_completed=True))
    total_books = sum(order.total_items for order in user_orders.filter(is_completed=True))
    
    return Response({
        'total_orders': total_orders,
        'completed_orders': completed_orders,
        'total_spent': total_spent,
        'total_books_purchased': total_books,
    })