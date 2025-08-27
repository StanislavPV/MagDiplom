from rest_framework import serializers
from .models import Rating
from orders.models import OrderItem


# Серіалайзер для відображення рейтингів
class RatingSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    book_title = serializers.CharField(source='book.title', read_only=True)
    is_own_rating = serializers.SerializerMethodField()
    purchased_on_site = serializers.SerializerMethodField()
    
    class Meta:
        model = Rating
        fields = '__all__'
    
    def get_is_own_rating(self, obj):
        user = self.context.get('request', {}).user
        return user.is_authenticated and obj.user == user
    
    def get_purchased_on_site(self, obj):
        """Перевіряє чи користувач купував цю книгу на нашому сайті"""
        return OrderItem.objects.filter(
            order__user=obj.user,
            book=obj.book,
            order__is_completed=True
        ).exists()


# Серіалайзер для створення/оновлення рейтингів
class RatingCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating ratings"""
    
    class Meta:
        model = Rating
        fields = ['book', 'score', 'review']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Don't allow updating the book field
        validated_data.pop('book', None)
        return super().update(instance, validated_data)
    
    def validate_score(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Score must be between 1 and 5")
        return value


# Серіалайзер для власних рейтингів користувача з деталями книг
class UserRatingSerializer(serializers.ModelSerializer):
    """Serializer for user's own ratings with book details"""
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_image = serializers.ImageField(source='book.image', read_only=True)
    purchased_on_site = serializers.SerializerMethodField()
    
    class Meta:
        model = Rating
        fields = '__all__'
    
    def get_purchased_on_site(self, obj):
        """Перевіряє чи користувач купував цю книгу на сайті"""
        return OrderItem.objects.filter(
            order__user=obj.user,
            book=obj.book,
            order__is_completed=True
        ).exists()