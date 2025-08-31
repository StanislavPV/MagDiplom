from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Book, Genre, Author, Wishlist
from django.urls import reverse

User = get_user_model()

class BookTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com', password='testpass123', name='Test User')
        self.genre = Genre.objects.create(name='Fiction')
        self.author = Author.objects.create(name='Test Author')
        self.book = Book.objects.create(
            title='Test Book', 
            year=2023, 
            description='Test description', 
            is_available=True, 
            price=10.00
        )
        self.book.genres.add(self.genre)
        self.book.author.add(self.author)
        self.client.force_authenticate(user=self.user)

    # Перегляд списку книг
    def test_book_list_success(self):
        response = self.client.get(reverse('book-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['results']), 0)

    # Деталі книги
    def test_book_detail_success(self):
        response = self.client.get(reverse('book-detail', kwargs={'pk': self.book.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Book')

    # Додавання до списку бажань
    def test_toggle_wishlist_add(self):
        data = {'book_id': self.book.id}
        response = self.client.post(reverse('wishlist-toggle'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Wishlist.objects.filter(user=self.user, book=self.book).exists())

    # Видалення зі списку бажань
    def test_toggle_wishlist_remove(self):
        Wishlist.objects.create(user=self.user, book=self.book)
        data = {'book_id': self.book.id}
        response = self.client.post(reverse('wishlist-toggle'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Wishlist.objects.filter(user=self.user, book=self.book).exists())