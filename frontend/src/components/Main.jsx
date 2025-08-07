import React, { useState, useEffect, useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'
import axiosInstance from '../axiosInstance'

const Main = () => {
  const { isLoggedIn } = useContext(AuthContext)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    fetchBooks()
  }, [location.search])

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const fetchBooks = async () => {
    try {
      const searchParams = new URLSearchParams(location.search)
      let url = '/books/?ordering=-year'
      
      if (searchParams.toString()) {
        url += `&${searchParams.toString()}`
      }

      const response = await axiosInstance.get(url)
      setBooks(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
  }

  const addToCart = async (bookId) => {
    if (!isLoggedIn) {
      showNotification('Увійдіть в систему, щоб додати книгу до кошика', 'warning')
      setTimeout(() => navigate('/login'), 1500)
      return
    }

    try {
      await axiosInstance.post('/cart/add/', {
        book: bookId,
        quantity: 1
      })
      
      // Show success notification
      showNotification('✅ Книгу додано до кошика!', 'success')
      
      // Update cart count in header
      window.dispatchEvent(new CustomEvent('cartUpdated'))
    } catch (error) {
      console.error('Error adding to cart:', error)
      showNotification('❌ Помилка при додаванні до кошика', 'error')
    }
  }

  const buyNow = (bookId) => {
    if (!isLoggedIn) {
      showNotification('Увійдіть в систему для покупки', 'warning')
      setTimeout(() => navigate('/login'), 1500)
      return
    }
    // Navigate to checkout with specific book
    navigate(`/checkout?book=${bookId}`)
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

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Завантаження...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='container mt-4'>
      {/* Notification Toast */}
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
          <h2 className="mb-4">📖 Наші книги ({books.length})</h2>
        </div>
        {books.length === 0 ? (
          <div className="col-12 text-center">
            <div className="alert alert-info">
              <h4>😔 Книги не знайдено</h4>
              <p>Спробуйте змінити параметри пошуку</p>
            </div>
          </div>
        ) : (
          books.map(book => (
            <div key={book.id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
              <div className="card h-100 shadow-sm book-card">
                <div className="card-img-wrapper">
                  <Link to={`/books/${book.id}`}>
                    {book.image ? (
                      <img
                        src={book.image}
                        className="card-img-top book-cover"
                        alt={book.title}
                        style={{ cursor: 'pointer' }}
                      />
                    ) : (
                      <div className="card-img-top book-cover-placeholder d-flex align-items-center justify-content-center">
                        <i className="fas fa-book fa-3x text-muted"></i>
                      </div>
                    )}
                  </Link>
                  {!book.is_available && (
                    <div className="position-absolute top-0 end-0 m-2">
                      <span className="badge bg-danger">Немає в наявності</span>
                    </div>
                  )}
                </div>

                <div className="card-body d-flex flex-column">
                  <h6 className="card-title fw-bold text-truncate" title={book.title}>
                    <Link to={`/books/${book.id}`} className="text-decoration-none">
                      {book.title}
                    </Link>
                  </h6>

                  <p className="card-text text-muted small mb-2">
                    <i className="fas fa-user"></i> {book.author?.map(a => a.name).join(', ')}
                  </p>

                  <p className="card-text text-muted small mb-2">
                    <i className="fas fa-calendar"></i> {book.year}
                  </p>

                  <div className="mb-2">
                    {book.genres?.slice(0, 2).map(genre => (
                      <span key={genre.id} className="badge bg-secondary me-1 small">
                        {genre.name}
                      </span>
                    ))}
                    {book.genres?.length > 2 && (
                      <span className="text-muted small">+{book.genres.length - 2}</span>
                    )}
                  </div>

                  <div className="mb-2">
                    <div className="d-flex align-items-center">
                      <div className="me-2">
                        {renderStars(book.average_rating)}
                      </div>
                      <small className="text-muted">
                        {book.average_rating ? `${book.average_rating} (${book.rating_count})` : 'Без рейтингу'}
                      </small>
                    </div>
                  </div>

                  <div className="mt-auto">
                    {book.price && (
                      <p className="card-text fw-bold text-success mb-2">
                        <i className="fas fa-hryvnia-sign"></i> {book.price} грн
                      </p>
                    )}

                    <div className="d-grid gap-1">
                      <Link
                        to={`/books/${book.id}`}
                        className="btn btn-outline-primary btn-sm"
                      >
                        <i className="fas fa-eye"></i> Детальніше
                      </Link>
                      
                      {isLoggedIn && book.is_available && (
                        <>
                          <button
                            onClick={() => addToCart(book.id)}
                            className="btn btn-success btn-sm"
                          >
                            <i className="fas fa-cart-plus"></i> До кошика
                          </button>
                          <button
                            onClick={() => buyNow(book.id)}
                            className="btn btn-primary btn-sm"
                          >
                            <i className="fas fa-bolt"></i> Купити зараз
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Main