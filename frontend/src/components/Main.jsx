import { useState, useEffect, useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axiosInstance from '../axiosInstance'
import { AuthContext } from '../AuthProvider'
import PopularBooksCarousel from './PopularBooksCarousel'
import UserBased from './UserBased'  // Додати цей імпорт
import ContRec from './ContRec'

// Головна сторінка з каталогом книг, пошуком та рекомендаціями
const Main = () => {
  const { isLoggedIn } = useContext(AuthContext)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [genres, setGenres] = useState([])
  const [authors, setAuthors] = useState([])
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    current_page: 1,
    total_pages: 1
  })
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    fetchBooks()
    fetchGenres()
    fetchAuthors()
  }, [location.search])

  // Автоматично ховаємо сповіщення через 3 секунди
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const fetchGenres = async () => {
    try {
      const response = await axiosInstance.get('/genres/')
      setGenres(response.data)
    } catch (error) {
      console.error('Error fetching genres:', error)
    }
  }

  const fetchAuthors = async () => {
    try {
      const response = await axiosInstance.get('/authors/')
      setAuthors(response.data)
    } catch (error) {
      console.error('Error fetching authors:', error)
    }
  }

  const fetchBooks = async () => {
    try {
      const searchParams = new URLSearchParams(location.search)
      let url = '/books/?ordering=-year'

      if (searchParams.toString()) {
        url = `/books/?${searchParams.toString()}`
        if (!searchParams.has('ordering')) {
          url += '&ordering=-year'
        }
      }

      const response = await axiosInstance.get(url)
      setBooks(response.data.results || response.data)

      // Handle pagination
      if (response.data.count !== undefined) {
        const currentPage = parseInt(searchParams.get('page') || '1')
        const pageSize = 8
        const totalPages = Math.ceil(response.data.count / pageSize)

        setPagination({
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous,
          current_page: currentPage,
          total_pages: totalPages
        })
      }
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

      showNotification('✅ Книгу додано до кошика!', 'success')
      window.dispatchEvent(new CustomEvent('cartUpdated'))
    } catch (error) {
      console.error('Error adding to cart:', error)
      showNotification('❌ Помилка при додаванні до кошика', 'error')
    }
  }

  const addToWishlist = async (bookId) => {
    if (!isLoggedIn) {
      showNotification('Увійдіть в систему, щоб додати до бажаного', 'warning')
      setTimeout(() => navigate('/login'), 1500)
      return
    }

    try {
      const response = await axiosInstance.post('/wishlist/toggle/', { book_id: bookId })

      // Оновлюємо стан книги в списку
      setBooks(prevBooks =>
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
    if (!isLoggedIn) {
      showNotification('Увійдіть в систему для покупки', 'warning')
      setTimeout(() => navigate('/login'), 1500)
      return
    }

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

  const handleAuthorClick = (authorId) => {
    const searchParams = new URLSearchParams(location.search)
    searchParams.set('author', authorId)
    searchParams.delete('page') // Reset to first page
    navigate(`/?${searchParams.toString()}`)
  }

  const handlePageChange = (page) => {
    const searchParams = new URLSearchParams(location.search)
    if (page > 1) {
      searchParams.set('page', page)
    } else {
      searchParams.delete('page')
    }
    navigate(`/?${searchParams.toString()}`)
  }

  // Функція для додавання книги до переглянутих з терміном життя 1 день
  const addBookToViewed = (bookId) => {
    const now = new Date().getTime()
    const expiryTime = 24 * 60 * 60 * 1000 // 1 день в мілісекундах
    
    // Отримуємо існуючі дані
    let viewedData = localStorage.getItem('viewedBooks')
    let viewedBooks = []
    
    if (viewedData) {
      try {
        const parsed = JSON.parse(viewedData)
        // Перевіряємо чи не застарілі дані
        if (parsed.expiry && now < parsed.expiry) {
          viewedBooks = Array.isArray(parsed.books) ? parsed.books : []
        }
      } catch (error) {
        console.log('Invalid viewed books data, resetting')
      }
    }
    
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

  const getPageTitle = () => {
    const searchParams = new URLSearchParams(location.search)
    const searchTerm = searchParams.get('search')
    const genreId = searchParams.get('genres')
    const authorId = searchParams.get('author')

    if (searchTerm && genreId) {
      const genre = genres.find(g => g.id.toString() === genreId)
      return `Результат пошуку "${searchTerm}" в категорії "${genre?.name || 'Невідома категорія'}"`
    } else if (searchTerm && authorId) {
      const author = authors.find(a => a.id.toString() === authorId)
      return `Результат пошуку "${searchTerm}" автора "${author?.name || 'Невідомий автор'}"`
    } else if (searchTerm) {
      return `Результат пошуку "${searchTerm}"`
    } else if (genreId) {
      const genre = genres.find(g => g.id.toString() === genreId)
      return `Категорія "${genre?.name || 'Невідома категорія'}"`
    } else if (authorId) {
      const author = authors.find(a => a.id.toString() === authorId)
      return `Автор "${author?.name || 'Невідомий автор'}"`
    }

    return 'Наші книги'
  }

  const renderPagination = () => {
    if (pagination.total_pages <= 1) return null

    const pages = []
    const currentPage = pagination.current_page
    const totalPages = pagination.total_pages

    // First page button
    if (currentPage > 1) {
      pages.push(
        <li key="first" className="page-item">
          <button
            className="page-link"
            onClick={() => handlePageChange(1)}
          >
            Перша
          </button>
        </li>
      )
    }

    // Previous button
    if (currentPage > 1) {
      pages.push(
        <li key="prev" className="page-item">
          <button
            className="page-link"
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Попередня
          </button>
        </li>
      )
    }

    // Page numbers
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      pages.push(
        <li key={i} className={`page-item ${i === currentPage ? 'active' : ''}`}>
          <button
            className="page-link"
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        </li>
      )
    }

    // Next button
    if (currentPage < totalPages) {
      pages.push(
        <li key="next" className="page-item">
          <button
            className="page-link"
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Наступна
          </button>
        </li>
      )
    }

    // Last page button
    if (currentPage < totalPages) {
      pages.push(
        <li key="last" className="page-item">
          <button
            className="page-link"
            onClick={() => handlePageChange(totalPages)}
          >
            Остання
          </button>
        </li>
      )
    }

    return (
      <nav className="mt-4">
        <ul className="pagination justify-content-center">
          {pages}
        </ul>
      </nav>
    )
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="container mt-5">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Завантаження...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className='main-container'>
        <div className='container mt-4'>
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

          {/* Каруселі - тільки на головній сторінці (без search параметрів) */}
          {!location.search && (
            <>
              {/* 1. Популярні книги (завжди) */}
              <PopularBooksCarousel />
              
              {/* 2. User-based рекомендації (тільки для авторизованих) */}
              <UserBased />
              
              {/* 3. Content-based рекомендації (на основі переглянутих) */}
              <ContRec />
            </>
          )}

          <div className="row">
            <div className="col-12">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="fw-bold text-primary mb-0">
                  <i className="fas fa-book-open me-2"></i>
                  {getPageTitle()}
                </h2>
                
              </div>
            </div>

            {books.length === 0 ? (
              <div className="col-12">
                <div className="empty-state">
                  <i className="fas fa-search fa-3x"></i>
                  <h4>Книги не знайдено</h4>
                  <p>Спробуйте змінити параметри пошуку або перегляньте всі книги</p>
                  <Link to="/" className="btn btn-primary">
                    <i className="fas fa-refresh me-2"></i>
                    Скинути фільтри
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="row">
                  {books.map(book => (
                    <div key={book.id} className="col-xl-3 col-lg-4 col-md-6 col-sm-6 mb-4">
                      <div className="card h-100 book-card">
                        <div className="card-img-wrapper">
                          <div onClick={() => handleBookClick(book.id)} style={{ cursor: 'pointer' }}>
                            {book.image ? (
                              <img
                                src={book.image}
                                className="book-cover"
                                alt={book.title}
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.nextElementSibling.style.display = 'flex'
                                }}
                              />
                            ) : (
                              <div className="book-cover-placeholder">
                                <i className="fas fa-book fa-3x text-muted"></i>
                              </div>
                            )}
                            {!book.image && (
                              <div className="book-cover-placeholder" style={{ display: 'none' }}>
                                <i className="fas fa-book fa-3x text-muted"></i>
                              </div>
                            )}
                          </div>
                          {!book.is_available && (
                            <div className="position-absolute top-0 end-0 m-2">
                              <span className="badge bg-danger">Немає в наявності</span>
                            </div>
                          )}

                          {/* Wishlist button */}
                          {isLoggedIn && (
                            <div className="position-absolute top-0 start-0 m-2">
                              <button
                                onClick={() => addToWishlist(book.id)}
                                className={`btn btn-sm ${book.is_in_wishlist ? 'btn-danger' : 'btn-outline-light'} rounded-circle`}
                                title={book.is_in_wishlist ? 'Видалити з бажаного' : 'Додати до бажаного'}
                              >
                                <i className={`${book.is_in_wishlist ? 'fas' : 'far'} fa-heart`}></i>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="card-body d-flex flex-column">
                          <h6 className="card-title fw-bold text-truncate" title={book.title}>
                            <span 
                              onClick={() => handleBookClick(book.id)} 
                              className="text-decoration-none text-dark"
                              style={{ cursor: 'pointer' }}
                            >
                              {book.title}
                            </span>
                          </h6>

                          <p className="card-text text-muted small mb-2">
                            <i className="fas fa-user me-1"></i>
                            {book.author?.map((a, index) => (
                              <span key={a.id}>
                                <button
                                  className="author-link"
                                  onClick={() => handleAuthorClick(a.id)}
                                >
                                  {a.name}
                                </button>
                                {index < book.author.length - 1 && ', '}
                              </span>
                            ))}
                          </p>

                          <p className="card-text text-muted small mb-2">
                            <i className="fas fa-calendar me-1"></i>
                            {book.year}
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

                          <div className="mb-3">
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
                              <p className="card-text fw-bold text-success mb-3 fs-5">
                                <i className="fas fa-hryvnia-sign"></i> {book.price} грн
                              </p>
                            )}

                            {isLoggedIn && book.is_available && (
                              <div className="btn-group-book">
                                <button
                                  onClick={() => buyNow(book.id)}
                                  className="btn btn-soft-primary btn-sm"
                                >
                                  <i className="fas fa-shopping-bag"></i> Купити
                                </button>
                                <button
                                  onClick={() => addToCart(book.id)}
                                  className="btn btn-soft-success btn-sm"
                                >
                                  До <i className="fas fa-shopping-cart"></i>
                                </button>
                              </div>
                            )}

                            {!isLoggedIn && book.is_available && (
                              <div className="d-grid">
                                <Link to="/login" className="btn btn-outline-primary btn-sm">
                                  <i className="fas fa-sign-in-alt"></i> Увійти для покупки
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {renderPagination()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Main