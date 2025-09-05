from django.shortcuts import render
from .serializers import UserSerializer, UserProfileSerializer, PasswordResetSerializer
from rest_framework import generics
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes


class RegisterView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  
  
  
class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_serializer = UserProfileSerializer(request.user)
        response = {
            'status': 'Request was permitted',
            'user': user_serializer.data
        }
        return Response(response)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Профіль успішно оновлено',
                'user': serializer.data
            })
        else:
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Скидання паролю без токенів"""
    serializer = PasswordResetSerializer(data=request.data)
    
    if serializer.is_valid():
        email = serializer.validated_data['email']
        new_password = serializer.validated_data['new_password']
        
        User = get_user_model()
        user = User.objects.get(email=email)
        user.set_password(new_password)
        user.save()
        
        return Response({
            'success': True,
            'message': 'Пароль успішно змінено. Тепер ви можете увійти з новим паролем.'
        })
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)