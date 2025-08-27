from rest_framework import serializers
from .models import BookVector
from books.serializers import BookCatalogSerializer


class BookVectorSerializer(serializers.ModelSerializer):
    book = BookCatalogSerializer(read_only=True)
    
    class Meta:
        model = BookVector
        fields = ['book']


class RecommendationRequestSerializer(serializers.Serializer):
    viewed_books = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
        required=True
    )


class BookViewTrackSerializer(serializers.Serializer):
    book_id = serializers.IntegerField(required=True)