from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Order
from .serializers import (
    OrderSerializer, 
    OrderCreateSerializer,
    OrderListSerializer
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    """Create order from user's cart"""
    serializer = OrderCreateSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        order = serializer.save()
        return Response({
            'message': 'Order created successfully',
            'order': OrderSerializer(order).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_data(request):
    """Get user data for order form pre-filling"""
    user = request.user
    return Response({
        'contact_name': user.name,
        'contact_email': user.email,
        'contact_phone': getattr(user, 'phone_number', ''),
    })


class UserOrdersView(generics.ListAPIView):
    """List user's orders"""
    serializer_class = OrderListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')


class OrderDetailView(generics.RetrieveAPIView):
    """Get order details"""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)