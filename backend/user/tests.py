from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse

User = get_user_model()

class UserTests(APITestCase):
    # Успішна реєстрація користувача
    def test_user_registration_success(self):
        data = {
            'email': 'test@example.com',
            'password': 'testpass123',
            'name': 'Test User',
            'phone_number': '501234567',
            'password_confirm': 'testpass123'
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'test@example.com')
        # Реєстрація з існуючим email (помилка)
    def test_user_registration_duplicate_email(self):
        User.objects.create_user(email='test@example.com', password='pass123', name='Existing User')
        data = {
            'email': 'test@example.com',
            'password': 'newpass123',
            'name': 'New User',
            'phone_number': '501234567',
            'password_confirm': 'newpass123'
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # Реєстрація з неправильним підтвердженням пароля
    def test_user_registration_password_mismatch(self):
        data = {
            'email': 'test@example.com',
            'password': 'testpass123',
            'name': 'Test User',
            'phone_number': '501234567',
            'password_confirm': 'wrongpass'
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Паролі не співпадають', str(response.data))

    # Успішний логін
    def test_user_login_success(self):
        User.objects.create_user(email='test@example.com', password='testpass123', name='Test User')
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        response = self.client.post(reverse('login'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    # Логін з неправильним паролем
    def test_user_login_wrong_password(self):
        User.objects.create_user(email='test@example.com', password='testpass123', name='Test User')
        data = {
            'email': 'test@example.com',
            'password': 'wrongpass'
        }
        response = self.client.post(reverse('login'), data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)