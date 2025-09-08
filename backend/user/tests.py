from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class UserRegistrationTests(APITestCase):
    """Тести для реєстрації користувачів"""
    
    def test_user_registration_success(self):
        """Успішна реєстрація користувача"""
        data = {
            'email': 'test1@example.com',
            'password': 'testpass123',
            'name': 'Test User',
            'phone_number': '501234567',
            'password_confirm': 'testpass123'
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'test1@example.com')
        
    def test_user_registration_duplicate_email(self):
        """Реєстрація з існуючим email (помилка)"""
        User.objects.create_user(email='test2@example.com', password='pass123', name='Existing User')
        data = {
            'email': 'test2@example.com',
            'password': 'newpass123',
            'name': 'New User',
            'phone_number': '501234567',
            'password_confirm': 'newpass123'
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_password_mismatch(self):
        """Реєстрація з неправильним підтвердженням пароля"""
        data = {
            'email': 'test3@example.com',
            'password': 'testpass123',
            'name': 'Test User',
            'phone_number': '501234567',
            'password_confirm': 'wrongpass'
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Паролі не співпадають', str(response.data))


class UserLoginTests(APITestCase):
    """Тести для входу користувачів"""
    
    def test_user_login_success(self):
        """Успішний логін"""
        User.objects.create_user(email='login1@example.com', password='testpass123', name='Test User')
        data = {
            'email': 'login1@example.com',
            'password': 'testpass123'
        }
        response = self.client.post(reverse('login'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_user_login_wrong_password(self):
        """Логін з неправильним паролем"""
        User.objects.create_user(email='login2@example.com', password='testpass123', name='Test User')
        data = {
            'email': 'login2@example.com',
            'password': 'wrongpass'
        }
        response = self.client.post(reverse('login'), data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PasswordResetTests(APITestCase):
    """Тести для скидання паролю"""
    
    def test_password_reset_success(self):
        """Тест успішного скидання паролю"""
        user = User.objects.create_user(
            email='reset1@example.com', 
            password='oldpass123', 
            name='Test User'
        )
        
        data = {
            'email': 'reset1@example.com',
            'new_password': 'newpass123',
            'confirm_password': 'newpass123'
        }
        
        response = self.client.post(reverse('reset-password'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('Пароль успішно змінено', response.data['message'])
        
        # Перевіряємо, що пароль дійсно змінився
        user.refresh_from_db()
        self.assertTrue(user.check_password('newpass123'))

    def test_password_reset_nonexistent_email(self):
        """Тест скидання паролю з неіснуючим email"""
        data = {
            'email': 'nonexistent@example.com',
            'new_password': 'newpass123',
            'confirm_password': 'newpass123'
        }
        
        response = self.client.post(reverse('reset-password'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('Користувача з такою електронною поштою не знайдено', 
                      str(response.data['errors']))

    def test_password_reset_password_mismatch(self):
        """Тест скидання паролю з неспівпадаючими паролями"""
        User.objects.create_user(
            email='reset2@example.com', 
            password='oldpass123', 
            name='Test User'
        )
        
        data = {
            'email': 'reset2@example.com',
            'new_password': 'newpass123',
            'confirm_password': 'differentpass123'
        }
        
        response = self.client.post(reverse('reset-password'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('Паролі не співпадають', str(response.data['errors']))

    def test_password_reset_short_password(self):
        """Тест скидання паролю з коротким паролем"""
        User.objects.create_user(
            email='reset3@example.com', 
            password='oldpass123', 
            name='Test User'
        )
        
        data = {
            'email': 'reset3@example.com',
            'new_password': 'short',
            'confirm_password': 'short'
        }
        
        response = self.client.post(reverse('reset-password'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])


class UserProfileTests(APITestCase):
    """Тести для оновлення профілю"""
    
    def setUp(self):
        """Створюємо користувача для тестів профілю"""
        self.user = User.objects.create_user(
            email='profile@example.com',
            password='testpass123',
            name='Test User',
            phone_number='501234567'
        )
        # Створюємо токен для авторизації
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)

    def test_get_user_profile(self):
        """Тест отримання даних профілю"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        response = self.client.get(reverse('user-profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'profile@example.com')
        self.assertEqual(response.data['name'], 'Test User')
        self.assertEqual(response.data['phone_number'], '501234567')

    def test_update_user_profile_success(self):
        """Тест успішного оновлення профілю"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'name': 'Updated Name',
            'phone_number': '987654321'
        }
        
        response = self.client.patch(reverse('user-profile'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['user']['name'], 'Updated Name')
        self.assertEqual(response.data['user']['phone_number'], '987654321')
        
        # Перевіряємо, що дані дійсно змінилися в БД
        self.user.refresh_from_db()
        self.assertEqual(self.user.name, 'Updated Name')
        self.assertEqual(self.user.phone_number, '987654321')

    def test_update_user_profile_invalid_phone(self):
        """Тест оновлення профілю з неправильним номером телефону"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'name': 'Updated Name',
            'phone_number': '12345'  # Менше 9 цифр
        }
        
        response = self.client.patch(reverse('user-profile'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('phone_number', response.data['errors'])

    def test_update_user_profile_phone_with_letters(self):
        """Тест оновлення профілю з номером телефону що містить букви"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'name': 'Updated Name',
            'phone_number': '50abc1234'  # Містить букви
        }
        
        response = self.client.patch(reverse('user-profile'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('Номер телефону повинен містити тільки цифри', 
                      str(response.data['errors']['phone_number']))

    def test_update_user_profile_unauthorized(self):
        """Тест оновлення профілю без авторизації"""
        data = {
            'name': 'Updated Name',
            'phone_number': '987654321'
        }
        
        response = self.client.patch(reverse('user-profile'), data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_user_profile_partial(self):
        """Тест часткового оновлення профілю (тільки ім'я)"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'name': 'Only Name Updated'
        }
        
        response = self.client.patch(reverse('user-profile'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['user']['name'], 'Only Name Updated')
        # Телефон повинен залишитися незмінним
        self.assertEqual(response.data['user']['phone_number'], '501234567')

    def test_cannot_update_email(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'email': 'newemail@example.com',
            'name': 'Updated Name'
        }
        
        response = self.client.patch(reverse('user-profile'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['email'], 'profile@example.com')
        # Ім'я повинно оновитися
        self.assertEqual(response.data['user']['name'], 'Updated Name')