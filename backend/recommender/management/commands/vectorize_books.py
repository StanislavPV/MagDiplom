import os
import pickle
import numpy as np
from django.core.management.base import BaseCommand
from django.conf import settings
from books.models import Book
from recommender.models import BookVector
from deep_translator import GoogleTranslator
import time


class Command(BaseCommand):
    help = 'Векторизує всі книги з перекладом на англійську'

    def translate_text(self, text, src='uk', dest='en'):
        """Безпечний переклад тексту"""
        if not text or text.strip() == '':
            return ''
        
        try:
            translator = GoogleTranslator(source=src, target=dest)
            result = translator.translate(text)
            return result if result else text
        except Exception as e:
            self.stdout.write(f"   ⚠️  Помилка перекладу: {e}")
            return text

    def handle(self, *args, **options):
        self.stdout.write("🚀 Початок векторизації книг...")
        
        # 1. Завантажуємо навчену TF-IDF модель
        vectorizer_path = os.path.join(settings.BASE_DIR, 'recommender', 'tfidf_vectorizer.pkl')
        
        if not os.path.exists(vectorizer_path):
            self.stdout.write(f"❌ Файл векторизатора не знайдено: {vectorizer_path}")
            return
        
        try:
            with open(vectorizer_path, 'rb') as f:
                vectorizer = pickle.load(f)
            self.stdout.write("✅ Векторизатор завантажено!")
        except Exception as e:
            self.stdout.write(f"❌ Помилка завантаження векторизатора: {e}")
            return
        
        # 2. Тестуємо перекладач
        try:
            test_result = self.translate_text('тест')
            self.stdout.write(f"✅ Перекладач працює! Тест: 'тест' -> '{test_result}'")
        except Exception as e:
            self.stdout.write(f"❌ Помилка ініціалізації перекладача: {e}")
            return
        
        # 3. Отримуємо всі книги з БД
        books = Book.objects.prefetch_related('author', 'genres').all()
        total_books = books.count()
        self.stdout.write(f"📚 Знайдено {total_books} книг для векторизації")
        
        if total_books == 0:
            self.stdout.write("❌ Немає книг в базі даних!")
            return
        
        # 4. Обробляємо кожну книгу
        processed = 0
        errors = 0
        
        for i, book in enumerate(books, 1):
            try:
                self.stdout.write(f"\n📖 [{i}/{total_books}] Обробляємо: {book.title}")
                
                # Збираємо дані українською
                authors_uk = ', '.join([a.name for a in book.author.all()])
                genres_uk = ', '.join([g.name for g in book.genres.all()])
                description_uk = book.description or ''
                
                self.stdout.write(f"   Автори (UA): {authors_uk}")
                self.stdout.write(f"   Жанри (UA): {genres_uk}")
                self.stdout.write(f"   Опис (UA): {description_uk[:100]}... (повний текст)")
                
                # Перекладаємо на англійську - ПОВНИЙ ОПИС!
                authors_en = self.translate_text(authors_uk)
                time.sleep(0.1)
                
                genres_en = self.translate_text(genres_uk)
                time.sleep(0.1)
                
                # ВИПРАВЛЕНО: Перекладаємо ПОВНИЙ опис
                description_en = self.translate_text(description_uk) if description_uk else ''
                time.sleep(0.2)  # Трохи більша затримка для довгого тексту
                
                self.stdout.write(f"   Автори (EN): {authors_en}")
                self.stdout.write(f"   Жанри (EN): {genres_en}")
                self.stdout.write(f"   Опис (EN): {description_en[:100]}... (повний текст перекладено)")
                
                # Формуємо комбінований текст
                combined_text = f"{authors_en} {genres_en} {description_en}".strip()
                
                if not combined_text:
                    self.stdout.write(f"   ❌ Порожній текст для векторизації")
                    continue
                
                # Векторизуємо
                vector = vectorizer.transform([combined_text])
                vector_array = vector.toarray()[0]
                
                # Зберігаємо в БД
                book_vector, created = BookVector.objects.get_or_create(book=book)
                book_vector.vector = pickle.dumps(vector_array)
                book_vector.save()
                
                processed += 1
                
                if created:
                    self.stdout.write(f"   ✅ Створено новий вектор")
                else:
                    self.stdout.write(f"   🔄 Оновлено існуючий вектор")
                
            except Exception as e:
                errors += 1
                self.stdout.write(f"   ❌ Критична помилка: {e}")
                continue
        
        # 5. Підсумок
        self.stdout.write(f"\n🎉 Векторизація завершена!")
        self.stdout.write(f"✅ Успішно оброблено: {processed}")
        self.stdout.write(f"❌ Помилок: {errors}")
        self.stdout.write(f"📊 Всього в БД векторів: {BookVector.objects.count()}")