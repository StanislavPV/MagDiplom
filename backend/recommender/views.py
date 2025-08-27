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


# Генерує рекомендації книг на основі переглянутих користувачем
@api_view(['POST'])
@permission_classes([AllowAny])
def get_recommendations(request):
    """
    Генерує рекомендації на основі переглянутих книг
    """
    try:
        viewed_book_ids = request.data.get('viewed_books', [])
        
        if not viewed_book_ids:
            return Response({'recommendations': []})
        
        # Видаляємо дублікати і беремо останні 5
        unique_viewed_ids = list(dict.fromkeys(viewed_book_ids))[-5:]
        
        # Отримуємо вектори для переглянутих книг
        viewed_vectors = []
        valid_book_ids = []
        
        for book_id in unique_viewed_ids:
            try:
                book_vector = BookVector.objects.get(book_id=book_id)
                vector_data = pickle.loads(book_vector.vector)
                viewed_vectors.append(vector_data)
                valid_book_ids.append(book_id)
            except BookVector.DoesNotExist:
                continue
        
        if not viewed_vectors:
            return Response({'recommendations': []})
        
        # Усереднюємо вектори переглянутих книг
        if len(viewed_vectors) == 1:
            user_profile = viewed_vectors[0]
        else:
            user_profile = np.mean(viewed_vectors, axis=0)
        
        # Отримуємо всі доступні книги з векторами (крім переглянутих)
        candidate_books = BookVector.objects.filter(
            book__is_available=True
        ).exclude(
            book_id__in=unique_viewed_ids
        ).select_related('book')
        
        recommendations = []
        
        # Обчислюємо косинусну подібність для кожної книги
        for book_vector in candidate_books:
            try:
                candidate_vector = pickle.loads(book_vector.vector)
                
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
                continue
        
        # Сортуємо за подібністю і беремо топ-8
        recommendations.sort(key=lambda x: x['similarity'], reverse=True)
        top_recommendations = recommendations[:8]
        
        # Серіалізуємо книги
        recommended_books = [rec['book'] for rec in top_recommendations]
        serializer = BookCatalogSerializer(
            recommended_books, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'recommendations': serializer.data,
            'based_on_books': valid_book_ids,
            'total_candidates': len(recommendations)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error generating recommendations: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Відстежує перегляд книги користувачем
@api_view(['POST'])
@permission_classes([AllowAny])
def track_book_view(request):
    """
    Відстежує перегляд книги (опціонально для майбутнього використання)
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