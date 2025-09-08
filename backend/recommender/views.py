from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from books.models import Book
from books.serializers import BookCatalogSerializer
from .models import BookVector
import numpy as np
import pickle
from django.db.models import Q
from sklearn.metrics.pairwise import cosine_similarity
from django.core.cache import cache
import hashlib


def get_cached_vectors(book_ids):
    """Отримує вектори з кешу або БД"""
    vectors = {}
    uncached_ids = []
    
    # Перевіряємо кеш для кожного ID
    for book_id in book_ids:
        cache_key = f'book_vector_{book_id}'
        cached_vector = cache.get(cache_key)
        if cached_vector is not None:
            vectors[book_id] = cached_vector
        else:
            uncached_ids.append(book_id)
    
    # Завантажуємо некешовані вектори з БД
    if uncached_ids:
        book_vectors = BookVector.objects.filter(book_id__in=uncached_ids)
        for bv in book_vectors:
            try:
                vector = pickle.loads(bv.vector)
                vectors[bv.book_id] = vector
                # Кешуємо на 1 годину
                cache.set(f'book_vector_{bv.book_id}', vector, timeout=3600)
            except Exception:
                continue
    
    return vectors


def get_books_genres(book_ids):
    """Отримує жанри переглянутих книг"""
    return Book.objects.filter(
        id__in=book_ids
    ).prefetch_related('genres').values_list('genres', flat=True).distinct()


@api_view(['POST'])
@permission_classes([AllowAny])
def get_recommendations(request):
    """
    Генерує рекомендації на основі переглянутих книг з оптимізаціями
    Працює з першої переглянутої книги
    """
    try:
        viewed_book_ids = request.data.get('viewed_books', [])
        
        # Перевіряємо чи є хоча б одна переглянута книга
        if not viewed_book_ids:
            return Response({'recommendations': []})
        
        # Видаляємо дублікати і беремо останні 5 (або менше)
        unique_viewed_ids = list(dict.fromkeys(viewed_book_ids))[-5:]
        
        # Створюємо ключ кешу для результатів рекомендацій
        viewed_key = '_'.join(sorted(map(str, unique_viewed_ids)))
        cache_key = f'content_rec_{hashlib.md5(viewed_key.encode()).hexdigest()}'
        
        # Перевіряємо кеш рекомендацій
        cached_recommendations = cache.get(cache_key)
        if cached_recommendations:
            print(f"Returning cached recommendations for books: {unique_viewed_ids}")
            return Response(cached_recommendations)
        
        print(f"Generating new recommendations for {len(unique_viewed_ids)} viewed books: {unique_viewed_ids}")
        
        # Отримуємо вектори переглянутих книг з кешу
        viewed_vectors_dict = get_cached_vectors(unique_viewed_ids)
        
        if not viewed_vectors_dict:
            print("No vectors found for viewed books")
            return Response({'recommendations': []})
        
        # Створюємо профіль користувача
        viewed_vectors = list(viewed_vectors_dict.values())
        if len(viewed_vectors) == 1:
            # Якщо тільки одна книга переглянута
            user_profile = viewed_vectors[0]
            print(f"Created user profile from single book vector")
        else:
            # Усереднюємо вектори кількох книг
            user_profile = np.mean(viewed_vectors, axis=0)
            print(f"Created user profile from {len(viewed_vectors)} book vectors")
        
        # Отримуємо жанри переглянутих книг для фільтрації
        viewed_genres = get_books_genres(unique_viewed_ids)
        
        # Фільтруємо кандидатів за жанрами та обмежуємо кількість
        if viewed_genres:
            candidate_books = BookVector.objects.filter(
                book__genres__in=viewed_genres,
                book__is_available=True
            ).exclude(
                book_id__in=unique_viewed_ids
            ).select_related('book').distinct()[:150]
            print(f"Filtering by genres: {list(viewed_genres)}")
        else:
            # Якщо жанри не знайдені, беремо всі доступні книги
            candidate_books = BookVector.objects.filter(
                book__is_available=True
            ).exclude(
                book_id__in=unique_viewed_ids
            ).select_related('book')[:100]
            print("No genres found, using all available books")
        
        print(f"Found {len(candidate_books)} candidate books after genre filtering")
        
        # Отримуємо вектори кандидатів
        candidate_ids = [bv.book_id for bv in candidate_books]
        candidate_vectors_dict = get_cached_vectors(candidate_ids)
        
        recommendations = []
        
        # Обчислюємо косинусну подібність
        for book_vector in candidate_books:
            book_id = book_vector.book_id
            if book_id in candidate_vectors_dict:
                try:
                    candidate_vector = candidate_vectors_dict[book_id]
                    
                    # Обчислюємо косинусну подібність
                    similarity = cosine_similarity(
                        [user_profile], 
                        [candidate_vector]
                    )[0][0]
                    
                    recommendations.append({
                        'book': book_vector.book,
                        'similarity': similarity
                    })
                    
                except Exception as e:
                    print(f"Error calculating similarity for book {book_id}: {e}")
                    continue
        
        # Сортуємо за подібністю і беремо топ-8
        recommendations.sort(key=lambda x: x['similarity'], reverse=True)
        top_recommendations = recommendations[:8]
        
        print(f"Generated {len(top_recommendations)} recommendations from {len(recommendations)} candidates")
        
        # Серіалізуємо книги
        recommended_books = [rec['book'] for rec in top_recommendations]
        serializer = BookCatalogSerializer(
            recommended_books, 
            many=True, 
            context={'request': request}
        )
        
        response_data = {
            'recommendations': serializer.data,
            'based_on_books': list(viewed_vectors_dict.keys()),
            'total_candidates': len(recommendations),
            'viewed_books_count': len(unique_viewed_ids),
            'cache_used': False
        }
        
        # Кешуємо результат на 1 годину
        cache.set(cache_key, response_data, timeout=3600)
        
        return Response(response_data)
        
    except Exception as e:
        print(f"Error generating recommendations: {str(e)}")
        return Response(
            {'error': f'Error generating recommendations: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def track_book_view(request):
    """
    Відстежує перегляд книги 
    """
    try:
        book_id = request.data.get('book_id')
        
        if not book_id:
            return Response({'error': 'book_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Перевіряємо, що книга існує
        try:
            book = Book.objects.get(id=book_id, is_available=True)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({'message': 'Book view tracked successfully'})
        
    except Exception as e:
        return Response(
            {'error': f'Error tracking book view: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )