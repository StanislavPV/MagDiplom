from django.urls import path
from . import views

urlpatterns = [
    path('track-view/', views.track_book_view, name='track_book_view'),
    path('recent-views/', views.get_recently_viewed_books, name='get_recently_viewed_books'),
    path('transfer-session/', views.transfer_session_data, name='transfer_session_data'),
    path('clear-views/', views.clear_viewed_books, name='clear_viewed_books'),
]