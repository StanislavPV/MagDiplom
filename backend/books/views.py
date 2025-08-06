from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import filters
from .models import Book, Wishlist, Genre, Author
from .serializers import BookCatalogSerializer, BookDetailSerializer, WishlistSerializer, GenreSerializer, AuthorSerializer


class BookListView(generics.ListAPIView):
    """Main page - list all books with basic info"""
    queryset = Book.objects.filter(is_available=True)
    serializer_class = BookCatalogSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'author__name', 'genres__name']
    ordering_fields = ['year', 'title', 'price']
    ordering = ['-year']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by genres
        genres = self.request.query_params.get('genres', None)
        if genres:
            queryset = queryset.filter(genres__id=genres)
        
        # Filter by author
        author = self.request.query_params.get('author', None)
        if author:
            queryset = queryset.filter(author__id=author)
            
        return queryset.distinct()  # Add distinct to avoid duplicates


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