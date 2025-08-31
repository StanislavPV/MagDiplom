from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from books.models import Book
from ratings.models import Rating
from orders.models import Order, OrderItem
from django.urls import reverse

User = get_user_model()

class UserBasedTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com', password='testpass123', name='Test User')
        self.book1 = Book.objects.create(
            title='Book 1', 
            year=2023, 
            description='Description 1', 
            is_available=True
        )
        self.book2 = Book.objects.create(
            title='Book 2', 
            year=2023, 
            description='Description 2', 
            is_available=True
        )
        Rating.objects.create(book=self.book1, user=self.user, score=5)
        self.client.force_authenticate(user=self.user)

    # Отримання user-based рекомендацій
    def test_get_user_based_recommendations_success(self):
        response = self.client.get(reverse('user-based-recommendations'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('recommendations', response.data)

    # Статистика user-based
    def test_get_user_based_stats_success(self):
        response = self.client.get(reverse('user-based-stats'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('ratings_count', response.data)