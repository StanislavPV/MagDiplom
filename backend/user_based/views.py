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
from django.core.cache import cache
import joblib
import numpy as np
import pandas as pd
from django.db.models import Q
import os
import sys
from django.conf import settings
from .models import SVDRecommender
import hashlib
import json
import threading

import __main__
__main__.SVDRecommender = SVDRecommender

# Глобальні змінні для thread-safe кешування моделі
_model_lock = threading.Lock()
_cached_model = None

def load_user_based_model():
    """Завантажує навчену user-based модель з файлу з thread-safe кешуванням"""
    global _cached_model
    if _cached_model is None:
        with _model_lock:
            if _cached_model is None:  # Double-check locking
                model_path = os.path.join(os.path.dirname(__file__), 'svd_recommender_clean.pkl')
                try:
                    print(f"Loading model from: {model_path}")
                    _cached_model = joblib.load(model_path)
                    print("User-based model loaded and cached in memory!")
                except Exception as e:
                    print(f"Error loading user-based model: {e}")
                    return None
    return _cached_model

def get_matrix_cache_key():
    """Генерує ключ кешу для user-item матриці на основі поточних даних"""
    ratings_count = Rating.objects.count()
    orders_count = OrderItem.objects.filter(order__is_completed=True).count()
    
    data_hash = hashlib.md5(f"{ratings_count}_{orders_count}".encode()).hexdigest()
    return f'user_item_matrix_{data_hash}'

def create_current_user_item_matrix():
    """Створює поточну user-item матрицю з кешуванням та оптимізованими запитами"""
    cache_key = get_matrix_cache_key()
    cached_data = cache.get(cache_key)
    
    if cached_data:
        print("Using cached user-item matrix")
        return cached_data['matrix'], cached_data['user_to_idx'], cached_data['book_to_idx']
    
    print("Creating new user-item matrix for user-based...")
    
    all_ratings_data = []
    
    # Оптимізований запит для рейтингів з values() для швидшості
    ratings_data = Rating.objects.select_related('user', 'book').values(
        'user_id', 'book_id', 'score'
    )
    
    for rating in ratings_data:
        all_ratings_data.append({
            'user_id': rating['user_id'],
            'book_id': rating['book_id'],
            'rating': rating['score'],
            'is_implicit': False
        })
    
    # Створюємо set для швидкого пошуку існуючих пар рейтингів
    rated_user_book_pairs = {(r['user_id'], r['book_id']) for r in all_ratings_data}
    
    # Оптимізований запит для покупок з values() та distinct()
    purchases_data = OrderItem.objects.filter(
        order__is_completed=True
    ).select_related('order__user', 'book').values(
        'order__user_id', 'book_id'
    ).distinct()
    
    purchased_user_book_pairs = set()
    for purchase in purchases_data:
        user_book_pair = (purchase['order__user_id'], purchase['book_id'])
        
        if user_book_pair not in rated_user_book_pairs and user_book_pair not in purchased_user_book_pairs:
            purchased_user_book_pairs.add(user_book_pair)
            all_ratings_data.append({
                'user_id': purchase['order__user_id'],
                'book_id': purchase['book_id'],
                'rating': 4,
                'is_implicit': True
            })
    
    if not all_ratings_data:
        return None, {}, {}
    
    # Використовуємо set comprehension для унікальних значень
    unique_users = list(set(d['user_id'] for d in all_ratings_data))
    unique_books = list(set(d['book_id'] for d in all_ratings_data))
    
    user_to_idx = {user: idx for idx, user in enumerate(unique_users)}
    book_to_idx = {book: idx for idx, book in enumerate(unique_books)}
    
    matrix = np.zeros((len(unique_users), len(unique_books)))
    
    # Векторизоване заповнення матриці
    for data in all_ratings_data:
        user_idx = user_to_idx[data['user_id']]
        book_idx = book_to_idx[data['book_id']]
        matrix[user_idx, book_idx] = data['rating']
    
    cache_data = {
        'matrix': matrix,
        'user_to_idx': user_to_idx,
        'book_to_idx': book_to_idx
    }
    cache.set(cache_key, cache_data, timeout=3600)
    
    print(f"User-based matrix created and cached: {len(unique_users)} users x {len(unique_books)} books")
    
    return matrix, user_to_idx, book_to_idx

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_based_recommendations(request):
    """Генерує user-based collaborative filtering рекомендації з кешуванням"""
    try:
        user_cache_key = f'user_recommendations_{request.user.id}'
        cached_recommendations = cache.get(user_cache_key)
        
        if cached_recommendations:
            print(f"Using cached recommendations for user {request.user.id}")
            return Response(cached_recommendations)
        
        model_data = load_user_based_model()
        if model_data is None:
            return Response({
                'error': 'User-based model not found',
                'recommendations': [],
                'type': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        recommender = model_data['recommender']
        
        current_matrix, user_to_idx, book_to_idx = create_current_user_item_matrix()
        
        if current_matrix is None:
            return Response({
                'recommendations': [],
                'type': 'no_data',
                'message': 'No data available for user-based recommendations'
            })
        
        if request.user.id not in user_to_idx:
            return Response({
                'recommendations': [],
                'type': 'new_user',
                'message': 'Поставте рейтинги або зробіть покупки для отримання персональних рекомендацій'
            })
        
        user_idx = user_to_idx[request.user.id]
        user_ratings = current_matrix[user_idx]
        unrated_book_indices = np.where(user_ratings == 0)[0]
        
        if len(unrated_book_indices) == 0:
            return Response({
                'recommendations': [],
                'type': 'no_new_books',
                'message': 'Ви оцінили всі доступні книги! Додайте нові книги для рекомендацій'
            })
        
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
        
        predictions.sort(key=lambda x: x['predicted_rating'], reverse=True)

        top_predictions = predictions[:8]
        recommended_book_ids = [p['book_id'] for p in top_predictions]
        
        # Оптимізований запит книг з filter та select_related
        books = Book.objects.filter(id__in=recommended_book_ids, is_available=True)
        books_dict = {book.id: book for book in books}
        
        ordered_books = []
        for pred in top_predictions:
            if pred['book_id'] in books_dict:
                book = books_dict[pred['book_id']]
                book.predicted_rating = round(pred['predicted_rating'], 2)
                ordered_books.append(book)
        
        if not ordered_books:
            return Response({
                'recommendations': [],
                'type': 'no_available_books',
                'message': 'Рекомендовані книги тимчасово недоступні'
            })
        
        serializer = BookCatalogSerializer(ordered_books, many=True, context={'request': request})
        
        results = serializer.data
        for i, book_data in enumerate(results):
            if i < len(ordered_books):
                book_data['predicted_rating'] = ordered_books[i].predicted_rating
        
        response_data = {
            'recommendations': results,
            'type': 'user_based_collaborative',
            'total_recommendations': len(results),
            'user_activities': len(np.where(user_ratings > 0)[0]),
            'message': f'Персональні рекомендації на основі {len(np.where(user_ratings > 0)[0])} ваших активностей'
        }
        
        cache.set(user_cache_key, response_data, timeout=3600)
        
        return Response(response_data)
        
    except Exception as e:
        print(f"Error in user-based recommendations: {str(e)}")
        return Response({
            'error': str(e),
            'recommendations': [],
            'type': 'error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_based_stats(request):
    """Отримує статистику активності користувача для user-based системи"""
    try:
        user = request.user
        
        ratings_count = Rating.objects.filter(user=user).count()
        avg_rating = Rating.objects.filter(user=user).aggregate(
            avg=Avg('score')
        )['avg']
        
        purchases_count = OrderItem.objects.filter(
            order__user=user,
            order__is_completed=True
        ).values_list('book_id', flat=True).distinct().count()
        
        rated_books = Rating.objects.filter(user=user).values_list('book_id', flat=True)
        purchases_without_rating = OrderItem.objects.filter(
            order__user=user,
            order__is_completed=True
        ).exclude(book_id__in=rated_books).values_list('book_id', flat=True).distinct().count()
        
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
    """Очищає кеш та оновлює рекомендації"""
    try:
        user_cache_key = f'user_recommendations_{request.user.id}'
        cache.delete(user_cache_key)
        cache.delete('user_item_matrix_data')
        
        return Response({
            'message': 'Recommendations cache cleared successfully',
            'status': 'success'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_user_based_model_info(request):
    """Інформація про user-based модель"""
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