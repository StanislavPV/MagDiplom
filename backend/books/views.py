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


class BookListView(generics.ListAPIView):
    """Main page - list all books with basic info"""
    queryset = Book.objects.filter(is_available=True)
    serializer_class = BookCatalogSerializer
    filter_backends = [filters.SearchFilter]  # Видаляємо OrderingFilter
    search_fields = ['title', 'author__name', 'genres__name']
    pagination_class = BookPagination
    
    def get_queryset(self):
        queryset = super().get_queryset().annotate(
            average_rating=Avg('ratings__score')
        ).distinct()  # Важливо для ManyToMany полів
        
        # Filter by genres
        genres = self.request.query_params.get('genres', None)
        if genres:
            queryset = queryset.filter(genres__id=genres)
        
        # Filter by author
        author = self.request.query_params.get('author', None)
        if author:
            queryset = queryset.filter(author__id=author)
            
        # Filter by price range
        min_price = self.request.query_params.get('min_price', None)
        max_price = self.request.query_params.get('max_price', None)
        
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        # Застосовуємо distinct() після фільтрів
        queryset = queryset.distinct()
            
        # Rating filter with proper NULL handling
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
        
        # Add price range info to response
        all_books = Book.objects.filter(is_available=True, price__isnull=False)
        price_range = all_books.aggregate(
            min_price=Min('price'),
            max_price=Max('price')
        )
        
        response.data['price_range'] = price_range
        return response


@api_view(['GET'])
def popular_books(request):
    """Get popular books based on rating"""
    books = Book.objects.filter(is_available=True).annotate(
        avg_rating=Avg('ratings__score')
    ).filter(avg_rating__isnull=False).order_by('-avg_rating', 'id')[:7]
    
    serializer = BookCatalogSerializer(books, many=True, context={'request': request})
    return Response(serializer.data)


class BookDetailView(generics.RetrieveAPIView):
    """Book detail page with full info"""
    queryset = Book.objects.all()
    serializer_class = BookDetailSerializer


class GenreListView(generics.ListAPIView):
    """List all genres"""
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer


class AuthorListView(generics.ListAPIView):
    """List all authors"""
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer


class WishlistView(generics.ListCreateAPIView):
    """User's wishlist - list and add books"""
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)


class WishlistDeleteView(generics.DestroyAPIView):
    """Remove book from wishlist"""
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_wishlist(request):
    """Add/remove book from wishlist"""
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
        # Remove from wishlist
        wishlist_item.delete()
        return Response({'message': 'Removed from wishlist', 'in_wishlist': False})
    else:
        # Added to wishlist
        return Response({'message': 'Added to wishlist', 'in_wishlist': True})