from django.urls import path, include
from user import views as UserViews

urlpatterns = [
    path('register/', UserViews.RegisterView.as_view(), name='register'),
]
