from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from books.models import Book
from books.serializers import BookCatalogSerializer
from ratings.models import Rating
from orders.models import OrderItem
from django.db.models import Avg
import joblib
import numpy as np
import pandas as pd
from django.db.models import Q
import os
import sys
from django.conf import settings
from .models import SVDRecommender

import __main__
__main__.SVDRecommender = SVDRecommender

# Глобальна змінна для кешування моделі
_cached_model = None

def load_user_based_model():
    """Завантажує навчену user-based модель з файлу"""
    global _cached_model
    if _cached_model is None:
        model_path = os.path.join(os.path.dirname(__file__), 'svd_recommender_clean.pkl')
        try:
            print(f"🔍 Loading model from: {model_path}")
            _cached_model = joblib.load(model_path)
            print("✅ User-based model loaded successfully!")
        except Exception as e:
            print(f"❌ Error loading user-based model: {e}")
            return None
    return _cached_model

def create_current_user_item_matrix():
    """
    Створює поточну user-item матрицю з Django даних
    """
    print("📊 Creating current user-item matrix for user-based...")
    
    # Збираємо всі рейтинги та покупки
    all_ratings_data = []
    
    # Користувачі з рейтингами
    for rating in Rating.objects.select_related('user', 'book').all():
        all_ratings_data.append({
            'user_id': rating.user.id,
            'book_id': rating.book.id,
            'rating': rating.score,
            'is_implicit': False
        })
    
    # Користувачі з покупками (без рейтингів)
    rated_user_book_pairs = {(r['user_id'], r['book_id']) for r in all_ratings_data}
    
    for item in OrderItem.objects.filter(order__is_completed=True).select_related('order__user', 'book'):
        user_book_pair = (item.order.user.id, item.book.id)
        
        if user_book_pair not in rated_user_book_pairs:
            all_ratings_data.append({
                'user_id': item.order.user.id,
                'book_id': item.book.id,
                'rating': 4,  # Неявний рейтинг для покупок
                'is_implicit': True
            })
    
    if not all_ratings_data:
        return None, {}, {}
    
    # Створюємо mappings
    unique_users = list(set(d['user_id'] for d in all_ratings_data))
    unique_books = list(set(d['book_id'] for d in all_ratings_data))
    
    user_to_idx = {user: idx for idx, user in enumerate(unique_users)}
    book_to_idx = {book: idx for idx, book in enumerate(unique_books)}
    
    # Створюємо матрицю
    matrix = np.zeros((len(unique_users), len(unique_books)))
    
    for data in all_ratings_data:
        user_idx = user_to_idx[data['user_id']]
        book_idx = book_to_idx[data['book_id']]
        matrix[user_idx, book_idx] = data['rating']
    
    print(f"📈 User-based matrix created: {len(unique_users)} users x {len(unique_books)} books")
    
    return matrix, user_to_idx, book_to_idx

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_based_recommendations(request):
    """
    Генерує user-based collaborative filtering рекомендації
    """
    try:
        # Завантажуємо модель
        model_data = load_user_based_model()
        if model_data is None:
            return Response({
                'error': 'User-based model not found',
                'recommendations': [],
                'type': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        recommender = model_data['recommender']
        
        # Створюємо поточну матрицю з актуальними даними
        current_matrix, user_to_idx, book_to_idx = create_current_user_item_matrix()
        
        if current_matrix is None:
            return Response({
                'recommendations': [],
                'type': 'no_data',
                'message': 'No data available for user-based recommendations'
            })
        
        # Перевіряємо чи є користувач у системі
        if request.user.id not in user_to_idx:
            # Користувач новий - немає рекомендацій
            return Response({
                'recommendations': [],
                'type': 'new_user',
                'message': 'Поставте рейтинги або зробіть покупки для отримання персональних рекомендацій'
            })
        
        # Генеруємо персональні рекомендації
        user_idx = user_to_idx[request.user.id]
        
        # Отримуємо неоцінені книги
        user_ratings = current_matrix[user_idx]
        unrated_book_indices = np.where(user_ratings == 0)[0]
        
        if len(unrated_book_indices) == 0:
            return Response({
                'recommendations': [],
                'type': 'no_new_books',
                'message': 'Ви оцінили всі доступні книги! Додайте нові книги для рекомендацій'
            })
        
        # Передбачаємо рейтинги для неоцінених книг
        predictions = []
        idx_to_book = {idx: book_id for book_id, idx in book_to_idx.items()}
        
        for book_idx in unrated_book_indices:
            try:
                predicted_rating = recommender.predict(user_idx, book_idx)
                book_id = idx_to_book[book_idx]
                
                predictions.append({
                    'book_id': book_id,
                    'predicted_rating': predicted_rating
                })
            except Exception as e:
                print(f"Error predicting for book {book_idx}: {e}")
                continue
        
        # Сортуємо за передбаченим рейтингом
        predictions.sort(key=lambda x: x['predicted_rating'], reverse=True)

        # Отримуємо топ-8 рекомендованих книг
        top_predictions = predictions[:8]
        recommended_book_ids = [p['book_id'] for p in top_predictions]
        
        # Завантажуємо книги з бази даних
        books = Book.objects.filter(id__in=recommended_book_ids, is_available=True)
        books_dict = {book.id: book for book in books}
        
        # Зберігаємо порядок рекомендацій
        ordered_books = []
        for pred in top_predictions:
            if pred['book_id'] in books_dict:
                book = books_dict[pred['book_id']]
                book.predicted_rating = round(pred['predicted_rating'], 2)
                ordered_books.append(book)
        
        # Якщо немає доступних книг для рекомендації
        if not ordered_books:
            return Response({
                'recommendations': [],
                'type': 'no_available_books',
                'message': 'Рекомендовані книги тимчасово недоступні'
            })
        
        # Серіалізуємо результати
        serializer = BookCatalogSerializer(ordered_books, many=True, context={'request': request})
        
        # Додаємо predicted_rating до кожного результату
        results = serializer.data
        for i, book_data in enumerate(results):
            if i < len(ordered_books):
                book_data['predicted_rating'] = ordered_books[i].predicted_rating
        
        return Response({
            'recommendations': results,
            'type': 'user_based_collaborative',
            'total_recommendations': len(results),
            'user_activities': len(np.where(user_ratings > 0)[0]),
            'message': f'Персональні рекомендації на основі {len(np.where(user_ratings > 0)[0])} ваших активностей'
        })
        
    except Exception as e:
        print(f"❌ Error in user-based recommendations: {str(e)}")
        return Response({
            'error': str(e),
            'recommendations': [],
            'type': 'error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_based_stats(request):
    """
    Отримує статистику активності користувача для user-based системи
    """
    try:
        user = request.user
        
        # Рейтинги користувача
        ratings_count = Rating.objects.filter(user=user).count()
        avg_rating = Rating.objects.filter(user=user).aggregate(
            avg=Avg('score')
        )['avg']
        
        # Покупки користувача
        purchases_count = OrderItem.objects.filter(
            order__user=user,
            order__is_completed=True
        ).count()
        
        # Покупки без рейтингів
        rated_books = Rating.objects.filter(user=user).values_list('book_id', flat=True)
        purchases_without_rating = OrderItem.objects.filter(
            order__user=user,
            order__is_completed=True
        ).exclude(book_id__in=rated_books).count()
        
        return Response({
            'ratings_count': ratings_count,
            'average_rating': round(avg_rating, 2) if avg_rating else 0,
            'purchases_count': purchases_count,
            'purchases_without_rating': purchases_without_rating,
            'implicit_ratings': purchases_without_rating,
            'total_activity': ratings_count + purchases_without_rating,
            'recommendation_type': 'user_based_collaborative'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_user_based_recommendations(request):
    """
    Примусово оновлює user-based рекомендації після зміни рейтингу/покупки
    """
    try:
        global _cached_model
        
        return Response({
            'message': 'User-based recommendations will be refreshed on next request',
            'status': 'success'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_user_based_model_info(request):
    """
    Інформація про user-based модель
    """
    try:
        model_data = load_user_based_model()
        if model_data is None:
            return Response({
                'error': 'User-based model not available'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        recommender = model_data['recommender']
        
        return Response({
            'model_type': 'SVD User-Based Collaborative Filtering',
            'n_components': recommender.n_components,
            'is_fitted': recommender.is_fitted,
            'explained_variance': round(recommender.svd.explained_variance_ratio_.sum(), 4) if hasattr(recommender.svd, 'explained_variance_ratio_') else 'Unknown',
            'algorithm': 'Truncated SVD',
            'implicit_rating_value': 4,
            'rating_scale': '1-5'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)