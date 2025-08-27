from django.db import models
from books.models import Book
from django.contrib.auth import get_user_model
import pickle
import numpy as np


class BookVector(models.Model):
    book = models.OneToOneField(Book, related_name='vector', on_delete=models.CASCADE)
    vector = models.BinaryField()

    def __str__(self):
        return f"Vector for {self.book.title}"

