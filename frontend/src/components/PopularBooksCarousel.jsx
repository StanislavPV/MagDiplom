import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axiosInstance from '../axiosInstance'

// Компонент карусель популярних книг на основі рейтингу
const PopularBooksCarousel = () => {
  const [popularBooks, setPopularBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    fetchPopularBooks()
  }, [])

  const fetchPopularBooks = async () => {
    try {
      const response = await axiosInstance.get('/books/popular/')
      setPopularBooks(response.data)
    } catch (error) {
      console.error('Error fetching popular books:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating || 0)
    const hasHalfStar = (rating || 0) % 1 !== 0

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
      prev === Math.max(0, popularBooks.length - 4) ? 0 : prev + 1
    )
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => 
      prev === 0 ? Math.max(0, popularBooks.length - 4) : prev - 1
    )
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Завантаження популярних книг...</span>
          </div>
        </div>
      </div>
    )
  }

  if (popularBooks.length === 0) {
    return null
  }

  return (
  <div className="container mt-5 mb-5">
    <div className="row">
      <div className="col-12">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h2 className="fw-bold mb-0" style={{ color: '#f7931e' }}>
            <i className="fas fa-fire me-2"></i>
            Популярні книги
          </h2>
          <span className="badge bg-warning text-dark fs-6">
            <i className="fas fa-crown me-1"></i>
            Топ {popularBooks.length}
          </span>
        </div>
      </div>
    </div>

      <div className="position-relative">
        {/* Контейнер карусель */}
        <div className="overflow-hidden">
          <div 
            className="d-flex transition-transform"
            style={{
              transform: `translateX(-${currentSlide * 25}%)`,
              transition: 'transform 0.5s ease-in-out'
            }}
          >
            {popularBooks.map((book) => (
              <div key={book.id} className="flex-shrink-0" style={{ width: '25%', padding: '0 10px' }}>
                <div className="card h-100 popular-book-card">
                  <div className="popular-card-wrapper">
                    <div className="popular-book-image">
                      <Link to={`/books/${book.id}`}>
                        {book.image ? (
                          <img
                            src={book.image}
                            className="popular-book-cover"
                            alt={book.title}
                          />
                        ) : (
                          <div className="popular-book-placeholder">
                            <i className="fas fa-book fa-2x text-muted"></i>
                          </div>
                        )}
                      </Link>
                    </div>
                    
                    <div className="popular-book-info">
                      <h6 className="popular-book-title fw-bold mb-2" title={book.title}>
                        <Link to={`/books/${book.id}`} className="text-decoration-none text-dark">
                          {book.title}
                        </Link>
                      </h6>
                      
                      <p className="popular-book-author text-muted small mb-2">
                        <i className="fas fa-user me-1"></i>
                        {book.author?.map(a => a.name).join(', ')}
                      </p>
                      
                      <div className="popular-book-rating mb-2">
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            {renderStars(book.average_rating)}
                          </div>
                          <small className="text-muted">
                            {book.average_rating ? `${book.average_rating} (${book.rating_count})` : 'Без рейтингу'}
                          </small>
                        </div>
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
            ))}
          </div>
        </div>

        {/* Кнопки навігації */}
        {popularBooks.length > 4 && (
          <>
            <button
              className="popular-carousel-control popular-carousel-control-prev"
              onClick={prevSlide}
              type="button"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              className="popular-carousel-control popular-carousel-control-next"
              onClick={nextSlide}
              type="button"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </>
        )}
      </div>

      {/* Індикатори точок */}
      {popularBooks.length > 4 && (
        <div className="d-flex justify-content-center mt-3">
          {Array.from({ length: Math.max(1, popularBooks.length - 3) }, (_, index) => (
            <button
              key={index}
              className={`popular-carousel-dot ${currentSlide === index ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default PopularBooksCarousel