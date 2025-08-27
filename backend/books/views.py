from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import filters
from rest_framework.pagination import PageNumberPagination
from django.db.models import Avg, Min, Max, Case, When, F, Value
from django.db.models.functions import Coalesce
from .models import Book, Wishlist, Genre, Author
from .serializers import BookCatalogSerializer, BookDetailSerializer, WishlistSerializer, GenreSerializer, AuthorSerializer


class BookPagination(PageNumberPagination):
    page_size = 8
    page_size_query_param = 'page_size'
    max_page_size = 100


# Відображає список всіх доступних книг з фільтрацією та пошуком
class BookListView(generics.ListAPIView):
    """Головна сторінка - список всіх книг з основною інформацією"""
    queryset = Book.objects.filter(is_available=True)
    serializer_class = BookCatalogSerializer
    filter_backends = [filters.SearchFilter]  # Видаляємо OrderingFilter
    search_fields = ['title', 'author__name', 'genres__name']
    pagination_class = BookPagination
    
    def get_queryset(self):
        queryset = super().get_queryset().annotate(
            average_rating=Avg('ratings__score')
        ).distinct()  # Важливо для ManyToMany полів
        
        # Фільтр за жанрами
        genres = self.request.query_params.get('genres', None)
        if genres:
            queryset = queryset.filter(genres__id=genres)
        
        # Фільтр за автором
        author = self.request.query_params.get('author', None)
        if author:
            queryset = queryset.filter(author__id=author)
            
        # Фільтр за ціновим діапазоном
        min_price = self.request.query_params.get('min_price', None)
        max_price = self.request.query_params.get('max_price', None)
        
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        # Застосовуємо distinct() після фільтрів
        queryset = queryset.distinct()
            
        # Сортування за рейтингом
        rating_order = self.request.query_params.get('rating_order', None)
        if rating_order == 'desc':
            # Книги з рейтингом спочатку (від вищого до нижчого), потім без рейтингу
            queryset = queryset.order_by(
                Case(
                    When(average_rating__isnull=True, then=Value(0)),  # NULL в кінець
                    default=Value(1)  # Книги з рейтингом першими
                ).desc(),
                F('average_rating').desc(nulls_last=True),  # Сортування рейтингу
                '-year',  # Додатковий критерій
                'id'  # Для стабільності сортування
            )
        elif rating_order == 'asc':
            # Книги з рейтингом спочатку (від нижчого до вищого), потім без рейтингу
            queryset = queryset.order_by(
                Case(
                    When(average_rating__isnull=True, then=Value(0)),  # NULL в кінець
                    default=Value(1)  # Книги з рейтингом першими
                ).desc(),
                F('average_rating').asc(nulls_last=True),  # Сортування рейтингу
                '-year',  # Додатковий критерій
                'id'  # Для стабільності сортування
            )
        else:
            # Стандартне сортування за роком
            queryset = queryset.order_by('-year', 'id')
            
        return queryset
    
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        
        # Додаємо інформацію про ціновий діапазон до відповіді
        all_books = Book.objects.filter(is_available=True, price__isnull=False)
        price_range = all_books.aggregate(
            min_price=Min('price'),
            max_price=Max('price')
        )
        
        response.data['price_range'] = price_range
        return response


# Отримує популярні книги на основі рейтингу
@api_view(['GET'])
def popular_books(request):
    """Отримати популярні книги на основі рейтингу"""
    books = Book.objects.filter(is_available=True).annotate(
        avg_rating=Avg('ratings__score')
    ).filter(avg_rating__isnull=False).order_by('-avg_rating', 'id')[:7]
    
    serializer = BookCatalogSerializer(books, many=True, context={'request': request})
    return Response(serializer.data)


# Відображає детальну інформацію про книгу
class BookDetailView(generics.RetrieveAPIView):
    """Сторінка детальної інформації про книгу"""
    queryset = Book.objects.all()
    serializer_class = BookDetailSerializer


# Отримує список всіх жанрів
class GenreListView(generics.ListAPIView):
    """Список всіх жанрів"""
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer


# Отримує список всіх авторів
class AuthorListView(generics.ListAPIView):
    """Список всіх авторів"""
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer


# Управляє списком бажань користувача
class WishlistView(generics.ListCreateAPIView):
    """Список бажань користувача - перегляд та додавання книг"""
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)


# Видаляє книгу зі списку бажань
class WishlistDeleteView(generics.DestroyAPIView):
    """Видалити книгу зі списку бажань"""
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)


# Додає або видаляє книгу зі списку бажань
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_wishlist(request):
    """Додати/видалити книгу зі списку бажань"""
    book_id = request.data.get('book_id')
    
    if not book_id:
        return Response({'error': 'book_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)
    
    wishlist_item, created = Wishlist.objects.get_or_create(
        user=request.user,
        book=book
    )
    
    if not created:
        # Видалити зі списку бажань
        wishlist_item.delete()
        return Response({'message': 'Removed from wishlist', 'in_wishlist': False})
    else:
        # Додано до списку бажань
        return Response({'message': 'Added to wishlist', 'in_wishlist': True})