from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from books.models import Book
from .models import Rating
from django.urls import reverse

User = get_user_model()

class RatingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com', password='testpass123', name='Test User')
        self.book = Book.objects.create(
            title='Test Book', 
            year=2023, 
            description='Test description', 
            is_available=True
        )
        self.client.force_authenticate(user=self.user)

    # Додавання рейтингу
    def test_create_rating_success(self):
        data = {'book': self.book.id, 'score': 5, 'review': 'Great book!'}
        response = self.client.post(reverse('create-rating'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Rating.objects.count(), 1)
        self.assertEqual(Rating.objects.first().score, 5)

    # Оновлення рейтингу
    def test_update_rating_success(self):
        rating = Rating.objects.create(book=self.book, user=self.user, score=3, review='OK')
        data = {'score': 4, 'review': 'Better'}
        response = self.client.patch(reverse('update-rating', kwargs={'pk': rating.id}), data)  # Змініть put на patch
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rating.refresh_from_db()
        self.assertEqual(rating.score, 4)

    # Видалення рейтингу
    def test_delete_rating_success(self):
        rating = Rating.objects.create(book=self.book, user=self.user, score=3, review='OK')
        response = self.client.delete(reverse('delete-rating', kwargs={'pk': rating.id}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Rating.objects.count(), 0)