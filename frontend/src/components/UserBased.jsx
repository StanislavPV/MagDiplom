import { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../axiosInstance'
import { AuthContext } from '../AuthProvider'

// Карусель user-based рекомендацій для авторизованих користувачів
const UserBased = () => {
  const { isLoggedIn } = useContext(AuthContext)
  const [userBasedBooks, setUserBasedBooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserBasedRecommendations()
    }
  }, [isLoggedIn])

  // Автоматично ховаємо сповіщення через 3 секунди
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const fetchUserBasedRecommendations = async () => {
    if (!isLoggedIn) return

    setLoading(true)
    setError(null)

    try {
      const response = await axiosInstance.get('/user-recommendations/')
      
      if (response.data.recommendations && response.data.recommendations.length > 0) {
        setUserBasedBooks(response.data.recommendations)
        setCurrentSlide(0)
      } else {
        setError(response.data.message || 'Немає user-based рекомендацій')
      }
    } catch (error) {
      console.error('Error fetching user-based recommendations:', error)
      setError('Помилка при завантаженні персональних рекомендацій')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
  }

  const addToCart = async (bookId) => {
    try {
      await axiosInstance.post('/cart/add/', {
        book: bookId,
        quantity: 1
      })

      showNotification('✅ Книгу додано до кошика!', 'success')
      window.dispatchEvent(new CustomEvent('cartUpdated'))
    } catch (error) {
      console.error('Error adding to cart:', error)
      showNotification('❌ Помилка при додаванні до кошика', 'error')
    }
  }

  const addToWishlist = async (bookId) => {
    try {
      const response = await axiosInstance.post('/wishlist/toggle/', { book_id: bookId })

      setUserBasedBooks(prevBooks =>
        prevBooks.map(book =>
          book.id === bookId
            ? { ...book, is_in_wishlist: response.data.in_wishlist }
            : book
        )
      )

      showNotification(
        response.data.in_wishlist ? '❤️ Додано до бажаного' : '💔 Видалено з бажаного',
        'success'
      )
    } catch (error) {
      console.error('Error toggling wishlist:', error)
      showNotification('❌ Помилка при додаванні до бажаного', 'error')
    }
  }

  const buyNow = async (bookId) => {
    try {
      await axiosInstance.post('/cart/add/', {
        book: bookId,
        quantity: 1
      })

      window.dispatchEvent(new CustomEvent('cartUpdated'))
      showNotification('✅ Книгу додано до кошика!', 'success')
      navigate('/checkout')
    } catch (error) {
      console.error('Error adding to cart before checkout:', error)
      showNotification('❌ Помилка при додаванні до кошика', 'error')
    }
  }

  const addBookToViewed = (bookId) => {
    const now = new Date().getTime()
    const expiryTime = 24 * 60 * 60 * 1000
    
    let viewedData = localStorage.getItem('viewedBooks')
    let viewedBooks = []
    
    if (viewedData) {
      try {
        const parsed = JSON.parse(viewedData)
        if (parsed.expiry && now < parsed.expiry) {
          viewedBooks = Array.isArray(parsed.books) ? parsed.books : []
        }
      } catch (error) {
        console.log('Invalid viewed books data, resetting')
      }
    }
    
    const filteredBooks = viewedBooks.filter(id => id !== bookId)
    const updatedBooks = [bookId, ...filteredBooks].slice(0, 5)
    
    const dataToStore = {
      books: updatedBooks,
      expiry: now + expiryTime
    }
    
    localStorage.setItem('viewedBooks', JSON.stringify(dataToStore))
    window.dispatchEvent(new CustomEvent('viewedBooksUpdated', { 
      detail: { viewedBooks: updatedBooks } 
    }))
  }

  const handleBookClick = (bookId) => {
    addBookToViewed(bookId)
    navigate(`/books/${bookId}`)
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

  // Carousel navigation
  const nextSlide = () => {
    setCurrentSlide((prev) => 
      prev === Math.max(0, userBasedBooks.length - 4) ? 0 : prev + 1
    )
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => 
      prev === 0 ? Math.max(0, userBasedBooks.length - 4) : prev - 1
    )
  }

  // Не показувати компонент для неавторизованих користувачів
  if (!isLoggedIn) {
    return null
  }

  // Показувати повідомлення про завантаження
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Завантаження персональних рекомендацій...</span>
          </div>
        </div>
      </div>
    )
  }

  // Не показувати компонент якщо є помилка або немає рекомендацій
  if (error || !userBasedBooks || userBasedBooks.length === 0) {
    return null
  }

  return (
    <div className="container mt-5 mb-5">
      {/* Сповіщення */}
      {notification && (
        <div className={`alert alert-${notification.type === 'success' ? 'success' : notification.type === 'error' ? 'danger' : 'warning'} alert-dismissible fade show position-fixed`}
          style={{ top: '20px', right: '20px', zIndex: 1050, minWidth: '300px' }}>
          {notification.message}
          <button
            type="button"
            className="btn-close"
            onClick={() => setNotification(null)}
          ></button>
        </div>
      )}

      <div className="row">
      <div className="col-12">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h2 className="fw-bold mb-0" style={{ color: '#8b5cf6' }}>
            <i className="fas fa-users me-2"></i>
            Персональні рекомендації
          </h2>
          <span className="badge fs-6" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>
            <i className="fas fa-user-check me-1"></i>
            Для вас
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
            {userBasedBooks.map((book) => {
              const hasRating = book.average_rating && Number(book.average_rating) > 0
              
              return (
                <div key={book.id} className="flex-shrink-0" style={{ width: '25%', padding: '0 10px' }}>
                  <div className="card h-100 user-based-card">
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
                            <div className="d-flex align-items-center">
                              <div className="me-2">
                                {renderStars(book.average_rating)}
                              </div>
                              <small className="text-muted">
                                {`${Number(book.average_rating).toFixed(1)} (${book.rating_count || 0})`}
                              </small>
                            </div>
                          ) : (
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
        {userBasedBooks.length > 4 && (
          <>
            <button
              className="user-based-control user-based-control-prev"
              onClick={prevSlide}
              type="button"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              className="user-based-control user-based-control-next"
              onClick={nextSlide}
              type="button"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </>
        )}
      </div>

      {/* Dots indicator */}
      {userBasedBooks.length > 4 && (
        <div className="d-flex justify-content-center mt-3">
          {Array.from({ length: Math.max(1, userBasedBooks.length - 3) }, (_, index) => (
            <button
              key={index}
              className={`user-based-dot ${currentSlide === index ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default UserBased