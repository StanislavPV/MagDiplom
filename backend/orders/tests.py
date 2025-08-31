from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from books.models import Book
from cart.models import Cart, CartItem
from .models import Order
from django.urls import reverse

User = get_user_model()

class OrderTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com', password='testpass123', name='Test User')
        self.book = Book.objects.create(
            title='Test Book', 
            year=2023, 
            description='Test description', 
            is_available=True, 
            price=10.00
        )
        self.client.force_authenticate(user=self.user)

    # Створення замовлення
    def test_create_order_success(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, book=self.book, quantity=1)
        data = {
            'contact_name': 'Test User',
            'contact_email': 'test@example.com',
            'contact_phone': '501234567',
            'delivery_address': 'Test Address',
            'payment_method': 'cash'
        }
        response = self.client.post(reverse('create-order'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)

    # Перегляд замовлень користувача
    def test_user_orders_list(self):
        Order.objects.create(
            user=self.user, 
            contact_name='Test', 
            contact_email='test@example.com', 
            total_amount=10.00,
            delivery_address='Address',
            payment_method='cash'
        )
        response = self.client.get(reverse('user-orders'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)