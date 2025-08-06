from django.urls import path, include
from user import views as UserViews
from books import views as BookViews
from ratings import views as RatingViews
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


urlpatterns = [
    path('register/', UserViews.RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('protected-view/', UserViews.ProtectedView.as_view(), name='protected_view'),
    
    # Books
    path('books/', BookViews.BookListView.as_view(), name='book-list'),
    path('books/<int:pk>/', BookViews.BookDetailView.as_view(), name='book-detail'),
    
    # Genres and Authors
    path('genres/', BookViews.GenreListView.as_view(), name='genres'),
    path('authors/', BookViews.AuthorListView.as_view(), name='authors'),
    
    # Wishlist
    path('wishlist/', BookViews.WishlistView.as_view(), name='wishlist'),
    path('wishlist/<int:pk>/', BookViews.WishlistDeleteView.as_view(), name='wishlist-delete'),
    path('wishlist/toggle/', BookViews.toggle_wishlist, name='wishlist-toggle'),
    
    # Ratings
    path('books/<int:book_id>/ratings/', RatingViews.BookRatingsListView.as_view(), name='book-ratings'),
    path('books/<int:book_id>/rating/', RatingViews.user_book_rating, name='user-book-rating'),
    path('ratings/', RatingViews.CreateRatingView.as_view(), name='create-rating'),
    path('ratings/<int:pk>/', RatingViews.UpdateRatingView.as_view(), name='update-rating'),
    path('ratings/<int:pk>/delete/', RatingViews.DeleteRatingView.as_view(), name='delete-rating'),
    path('my-ratings/', RatingViews.UserRatingsListView.as_view(), name='my-ratings'),
]