from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from books.models import Book
from .models import Rating
from .serializers import (
    RatingSerializer, 
    RatingCreateUpdateSerializer, 
    UserRatingSerializer
)


class BookRatingsListView(generics.ListAPIView):
    """List all ratings for a specific book"""
    serializer_class = RatingSerializer
    
    def get_queryset(self):
        book_id = self.kwargs['book_id']
        return Rating.objects.filter(book_id=book_id).order_by('-created_at')


class UserRatingsListView(generics.ListAPIView):
    """List current user's ratings"""
    serializer_class = UserRatingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Rating.objects.filter(user=self.request.user).order_by('-created_at')


class CreateRatingView(generics.CreateAPIView):
    """Create a new rating"""
    serializer_class = RatingCreateUpdateSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UpdateRatingView(generics.UpdateAPIView):
    """Update user's own rating"""
    serializer_class = RatingCreateUpdateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Rating.objects.filter(user=self.request.user)


class DeleteRatingView(generics.DestroyAPIView):
    """Delete user's own rating"""
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Rating.objects.filter(user=self.request.user)


@api_view(['GET', 'POST', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_book_rating(request, book_id):
    """Manage user's rating for a specific book"""
    book = get_object_or_404(Book, id=book_id)
    
    try:
        rating = Rating.objects.get(book=book, user=request.user)
    except Rating.DoesNotExist:
        rating = None
    
    if request.method == 'GET':
        # Get user's rating for this book
        if rating:
            serializer = RatingSerializer(rating, context={'request': request})
            return Response(serializer.data)
        return Response({'message': 'No rating found'}, status=status.HTTP_404_NOT_FOUND)
    
    elif request.method == 'POST':
        # Create new rating
        if rating:
            return Response({'error': 'Rating already exists. Use PUT to update.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Add book to the data before validation
        data = request.data.copy()
        data['book'] = book_id
        
        serializer = RatingCreateUpdateSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save(user=request.user, book=book)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'PUT':
        # Update existing rating
        if not rating:
            return Response({'error': 'No rating found to update'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # FIX: Use a simpler approach - just update the fields directly
        score = request.data.get('score')
        review = request.data.get('review', '')
        
        # Validate score
        if score is None:
            return Response({'error': 'Score is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            score = int(score)
            if not (1 <= score <= 5):
                return Response({'error': 'Score must be between 1 and 5'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'Score must be a valid number'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Update the rating
        rating.score = score
        rating.review = review
        rating.save()
        
        # Return updated rating
        serializer = RatingSerializer(rating, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'DELETE':
        # Delete rating
        if not rating:
            return Response({'error': 'No rating found to delete'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        rating.delete()
        return Response({'message': 'Rating deleted successfully'}, 
                       status=status.HTTP_204_NO_CONTENT)