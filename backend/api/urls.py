from django.urls import path, include
from user import views as UserViews
from books import views as BookViews
from ratings import views as RatingViews
from cart import views as CartViews
from orders import views as OrderViews
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


urlpatterns = [
    path('register/', UserViews.RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('protected-view/', UserViews.ProtectedView.as_view(), name='protected_view'),
    
    # Books
    path('books/', BookViews.BookListView.as_view(), name='book-list'),
    path('books/<int:pk>/', BookViews.BookDetailView.as_view(), name='book-detail'),
    path('books/popular/', BookViews.popular_books, name='popular-books'),
    
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
    
    # Cart
    path('cart/', CartViews.CartView.as_view(), name='cart'),
    path('cart/add/', CartViews.add_to_cart, name='add-to-cart'),
    path('cart/items/<int:item_id>/', CartViews.update_cart_item, name='update-cart-item'),
    path('cart/items/<int:item_id>/remove/', CartViews.remove_from_cart, name='remove-from-cart'),
    path('cart/clear/', CartViews.clear_cart, name='clear-cart'),
    path('cart/summary/', CartViews.cart_summary, name='cart-summary'),
    
    # Orders
    path('orders/', OrderViews.UserOrdersView.as_view(), name='user-orders'),
    path('orders/<int:pk>/', OrderViews.OrderDetailView.as_view(), name='order-detail'),
    path('orders/create/', OrderViews.create_order, name='create-order'),
    path('orders/user-data/', OrderViews.get_user_data, name='user-data'),
]