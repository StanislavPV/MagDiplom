from rest_framework import serializers
from .models import Book, Genre, Author, Wishlist
from django.db.models import Avg


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = '__all__'


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = '__all__'


# Легкий серіалайзер для каталогу книг
class BookCatalogSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    author = AuthorSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    rating_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Book
        fields = '__all__'
    
    def get_average_rating(self, obj):
        avg = obj.ratings.aggregate(Avg('score'))['score__avg']
        return round(avg, 1) if avg else None
    
    def get_rating_count(self, obj):
        return obj.ratings.count()


# Детальний серіалайзер для індивідуальних сторінок книг
class BookDetailSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    author = AuthorSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    rating_count = serializers.SerializerMethodField()
    is_in_wishlist = serializers.SerializerMethodField()
    user_rating = serializers.SerializerMethodField()
    
    class Meta:
        model = Book
        fields = '__all__'
    
    def get_average_rating(self, obj):
        avg = obj.ratings.aggregate(Avg('score'))['score__avg']
        return round(avg, 1) if avg else None
    
    def get_rating_count(self, obj):
        return obj.ratings.count()
    
    def get_is_in_wishlist(self, obj):
        user = self.context['request'].user
        if user.is_authenticated:
            return Wishlist.objects.filter(user=user, book=obj).exists()
        return False
    
    def get_user_rating(self, obj):
        user = self.context['request'].user
        if user.is_authenticated:
            rating = obj.ratings.filter(user=user).first()
            return rating.score if rating else None
        return None


class WishlistSerializer(serializers.ModelSerializer):
    book = BookCatalogSerializer(read_only=True)
    book_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Wishlist
        fields = '__all__'
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)