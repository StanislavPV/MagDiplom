from django.db import models
from django.contrib.auth import get_user_model
from books.models import Book
from django.core.validators import MinValueValidator, MaxValueValidator

class Rating(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    review = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  

    class Meta:
        unique_together = ('book', 'user')

    def __str__(self):
        return f'{self.user} - {self.book} ({self.score})'