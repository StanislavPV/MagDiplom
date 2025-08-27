import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../axiosInstance'

// Компонент карусель персональних рекомендацій на основі переглянутих книг
const ContRec = () => {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    fetchRecommendations()
    
    // Слухач події оновлення переглянутих книг
    const handleViewedBooksUpdate = (event) => {
      console.log('Viewed books updated:', event.detail.viewedBooks)
      fetchRecommendations()
    }
    
    window.addEventListener('viewedBooksUpdated', handleViewedBooksUpdate)
    
    // Очищення слухача при демонтажі компонента
    return () => {
      window.removeEventListener('viewedBooksUpdated', handleViewedBooksUpdate)
    }
  }, [])

  // Функція для отримання переглянутих книг з терміном життя
  const getViewedBooks = () => {
    const now = new Date().getTime()
    let viewedData = localStorage.getItem('viewedBooks')
    
    if (!viewedData) return []
    
    try {
      const parsed = JSON.parse(viewedData)
      // Перевіряємо чи не застарілі дані
      if (parsed.expiry && now < parsed.expiry) {
        return Array.isArray(parsed.books) ? parsed.books : []
      } else {
        // Видаляємо застарілі дані
        localStorage.removeItem('viewedBooks')
        return []
      }
    } catch (error) {
      console.log('Invalid viewed books data, resetting')
      localStorage.removeItem('viewedBooks')
      return []
    }
  }

  const fetchRecommendations = async () => {
    try {
      // Отримуємо переглянуті книги з localStorage з перевіркою терміну життя
      const viewedBooks = getViewedBooks()
      
      console.log('Fetching recommendations for books:', viewedBooks)
      
      if (viewedBooks.length === 0) {
        setRecommendations([])
        setLoading(false)
        return
      }

      const response = await axiosInstance.post('/recommendations/', {
        viewed_books: viewedBooks
      })

      console.log('Recommendations received:', response.data.recommendations?.length || 0)
      
      setRecommendations(response.data.recommendations || [])
      setCurrentSlide(0) // Скидаємо слайд при оновленні рекомендацій
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }

  // Функція для додавання книги до переглянутих з терміном життя
  const addBookToViewed = (bookId) => {
    const now = new Date().getTime()
    const expiryTime = 24 * 60 * 60 * 1000 // 1 день в мілісекундах
    
    // Отримуємо існуючі дані
    let viewedBooks = getViewedBooks()
    
    // Видаляємо книгу з поточної позиції, якщо вона вже є
    const filteredBooks = viewedBooks.filter(id => id !== bookId)
    
    // Додаємо книгу на початок
    const updatedBooks = [bookId, ...filteredBooks]
    
    // Обмежуємо до 5 останніх книг
    const limitedBooks = updatedBooks.slice(0, 5)
    
    // Зберігаємо з терміном життя
    const dataToStore = {
      books: limitedBooks,
      expiry: now + expiryTime
    }
    
    localStorage.setItem('viewedBooks', JSON.stringify(dataToStore))
    
    // Відправляємо подію для оновлення рекомендацій
    window.dispatchEvent(new CustomEvent('viewedBooksUpdated', { 
      detail: { viewedBooks: limitedBooks } 
    }))
  }

  const handleBookClick = (bookId) => {
    addBookToViewed(bookId)
    navigate(`/books/${bookId}`)
  }

  const renderStars = (rating) => {
    const stars = []
    // Переконуємося, що rating є числом або 0
    const numericRating = Number(rating) || 0
    const fullStars = Math.floor(numericRating)
    const hasHalfStar = (numericRating % 1) >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<i key={i} className="fas fa-star text-warning"></i>)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<i key={i} className="fas fa-star-half-alt text-warning"></i>)
      } else {
        stars.push(<i key={i} className="far fa-star text-warning"></i>)
      }
    }
    return stars
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => 
      prev === Math.max(0, recommendations.length - 4) ? 0 : prev + 1
    )
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => 
      prev === 0 ? Math.max(0, recommendations.length - 4) : prev - 1
    )
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Завантаження рекомендацій...</span>
          </div>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  const viewedBooksCount = getViewedBooks().length

  return (
    <div className="container mt-5 mb-5">
      <div className="row">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <h2 className="fw-bold text-primary mb-0">
              <i className="fas fa-magic me-2"></i>
              Рекомендовано для вас
            </h2>
            <span className="badge bg-info fs-6">
              На основі переглядів
            </span>
          </div>
        </div>
      </div>

      <div className="position-relative">
        {/* Carousel Container */}
        <div className="overflow-hidden">
          <div 
            className="d-flex transition-transform"
            style={{
              transform: `translateX(-${currentSlide * 25}%)`,
              transition: 'transform 0.5s ease-in-out'
            }}
          >
            {recommendations.map((book) => {
              const hasRating = book.average_rating && Number(book.average_rating) > 0
              
              return (
                <div key={book.id} className="flex-shrink-0" style={{ width: '25%', padding: '0 10px' }}>
                  <div className="card h-100 recommendation-card">
                    <div className="popular-card-wrapper">
                      <div className="popular-book-image">
                        <div 
                          onClick={() => handleBookClick(book.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          {book.image ? (
                            <img
                              src={book.image}
                              className="popular-book-cover"
                              alt={book.title}
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextElementSibling.style.display = 'flex'
                              }}
                            />
                          ) : (
                            <div className="popular-book-placeholder">
                              <i className="fas fa-book fa-2x text-muted"></i>
                            </div>
                          )}
                          {!book.image && (
                            <div className="popular-book-placeholder" style={{ display: 'none' }}>
                              <i className="fas fa-book fa-2x text-muted"></i>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="popular-book-info">
                        <h6 className="popular-book-title fw-bold mb-2" title={book.title}>
                          <span 
                            onClick={() => handleBookClick(book.id)}
                            className="text-decoration-none text-dark"
                            style={{ cursor: 'pointer' }}
                          >
                            {book.title}
                          </span>
                        </h6>

                        <p className="popular-book-author text-muted small mb-2">
                          <i className="fas fa-user me-1"></i>
                          {book.author?.map((a, index) => (
                            <span key={a.id}>
                              {a.name}
                              {index < book.author.length - 1 && ', '}
                            </span>
                          ))}
                        </p>

                        <div className="popular-book-rating mb-2">
                          {hasRating ? (
                            // Горизонтальне розташування для книг з рейтингом
                            <div className="d-flex align-items-center">
                              <div className="me-2">
                                {renderStars(book.average_rating)}
                              </div>
                              <small className="text-muted">
                                {`${Number(book.average_rating).toFixed(1)} (${book.rating_count || 0})`}
                              </small>
                            </div>
                          ) : (
                            // Вертикальне розташування для книг без рейтингу
                            <div className="d-flex flex-column align-items-start">
                              <div className="mb-1">
                                {renderStars(0)}
                              </div>
                              <small className="text-muted">
                                Без рейтингу
                              </small>
                            </div>
                          )}
                        </div>

                        {book.price && (
                          <p className="popular-book-price text-success fw-bold mb-0">
                            <i className="fas fa-hryvnia-sign"></i> {book.price} грн
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Navigation Arrows */}
        {recommendations.length > 4 && (
          <>
            <button
              className="recommendation-control recommendation-control-prev"
              onClick={prevSlide}
              type="button"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              className="recommendation-control recommendation-control-next"
              onClick={nextSlide}
              type="button"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </>
        )}
      </div>

      {/* Dots indicator */}
      {recommendations.length > 4 && (
        <div className="d-flex justify-content-center mt-3">
          {Array.from({ length: Math.max(1, recommendations.length - 3) }, (_, index) => (
            <button
              key={index}
              className={`recommendation-dot ${currentSlide === index ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ContRec