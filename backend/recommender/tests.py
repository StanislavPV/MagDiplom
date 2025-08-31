from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from books.models import Book
from .models import BookVector
from django.urls import reverse
import pickle
import numpy as np

User = get_user_model()

class RecommenderTests(APITestCase):
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
        # Створюємо вектори для тестування
        vector1 = np.random.rand(100)
        vector2 = np.random.rand(100)
        BookVector.objects.create(book=self.book1, vector=pickle.dumps(vector1))
        BookVector.objects.create(book=self.book2, vector=pickle.dumps(vector2))
        self.client.force_authenticate(user=self.user)

    # Отримання рекомендацій
    def test_get_recommendations_success(self):
        data = {'viewed_books': [self.book1.id]}
        response = self.client.post(reverse('get-recommendations'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('recommendations', response.data)