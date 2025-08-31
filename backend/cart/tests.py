from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from books.models import Book
from .models import Cart, CartItem
from django.urls import reverse

User = get_user_model()

class CartTests(APITestCase):
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

    # Додавання товару до кошика
    def test_add_to_cart_success(self):
        data = {'book': self.book.id, 'quantity': 2}
        response = self.client.post(reverse('add-to-cart'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CartItem.objects.count(), 1)
        self.assertEqual(CartItem.objects.first().quantity, 2)

    # Оновлення кількості товару в кошику
    def test_update_cart_item_success(self):
        cart = Cart.objects.create(user=self.user)
        cart_item = CartItem.objects.create(cart=cart, book=self.book, quantity=1)
        data = {'quantity': 3}
        response = self.client.put(reverse('update-cart-item', kwargs={'item_id': cart_item.id}), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cart_item.refresh_from_db()
        self.assertEqual(cart_item.quantity, 3)

    # Видалення товару з кошика
    def test_remove_from_cart_success(self):
        cart = Cart.objects.create(user=self.user)
        cart_item = CartItem.objects.create(cart=cart, book=self.book, quantity=1)
        response = self.client.delete(reverse('remove-from-cart', kwargs={'item_id': cart_item.id}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(CartItem.objects.count(), 0)

    # Очищення кошика
    def test_clear_cart_success(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, book=self.book, quantity=1)
        response = self.client.delete(reverse('clear-cart'))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(CartItem.objects.count(), 0)

    # Підсумок кошика
    def test_cart_summary_success(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, book=self.book, quantity=2)
        response = self.client.get(reverse('cart-summary'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_items'], 2)
        self.assertEqual(float(response.data['total_price']), 20.00)