import { useState, useEffect, useContext } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../axiosInstance'
import { AuthContext } from '../AuthProvider'
import Review from './Review'
import ContRec from './ContRec'

const BookDetail = () => {
    const { id } = useParams()
    const { isLoggedIn } = useContext(AuthContext)
    const navigate = useNavigate()
    const [book, setBook] = useState(null)
    const [loading, setLoading] = useState(true)
    const [notification, setNotification] = useState(null)

    useEffect(() => {
        if (id) {
            // Додаємо книгу до переглянутих при завантаженні сторінки деталей
            addBookToViewed(parseInt(id))
            fetchBookDetails()
        }
    }, [id])

    // Слухач для оновлення рейтингу книги
    useEffect(() => {
        const handleRatingUpdate = () => {
            fetchBookDetails()
        }

        window.addEventListener('ratingUpdated', handleRatingUpdate)
        
        return () => {
            window.removeEventListener('ratingUpdated', handleRatingUpdate)
        }
    }, [])

    // Auto-hide notification after 3 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [notification])

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

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type })
    }

    const fetchBookDetails = async () => {
        try {
            const response = await axiosInstance.get(`/books/${id}/`)
            setBook(response.data)
        } catch (error) {
            console.error('Error fetching book details:', error)
        } finally {
            setLoading(false)
        }
    }

    const addToCart = async () => {
        if (!isLoggedIn) {
            showNotification('Увійдіть в систему, щоб додати книгу до кошика', 'warning')
            setTimeout(() => navigate('/login'), 1500)
            return
        }

        try {
            await axiosInstance.post('/cart/add/', {
                book: book.id,
                quantity: 1
            })

            showNotification('✅ Книгу додано до кошика!', 'success')
            window.dispatchEvent(new CustomEvent('cartUpdated'))
        } catch (error) {
            console.error('Error adding to cart:', error)
            showNotification('❌ Помилка при додаванні до кошика', 'error')
        }
    }

    const buyNow = async () => {
        if (!isLoggedIn) {
            showNotification('Увійдіть в систему для покупки', 'warning')
            setTimeout(() => navigate('/login'), 1500)
            return
        }

        try {
            await axiosInstance.post('/cart/add/', {
                book: book.id,
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

    const handleWishlistToggle = async () => {
        if (!isLoggedIn) {
            showNotification('Увійдіть в систему, щоб додати до бажаного', 'warning')
            setTimeout(() => navigate('/login'), 1500)
            return
        }

        try {
            const response = await axiosInstance.post('/wishlist/toggle/', { book_id: book.id })
            
            setBook(prevBook => ({
                ...prevBook,
                is_in_wishlist: response.data.in_wishlist
            }))

            showNotification(
                response.data.in_wishlist ? '❤️ Додано до бажаного' : '💔 Видалено з бажаного',
                'success'
            )
        } catch (error) {
            console.error('Error toggling wishlist:', error)
            showNotification('❌ Помилка при додаванні до бажаного', 'error')
        }
    }

    const renderStars = (rating) => {
        const stars = []
        const maxStars = 5
        
        for (let i = 1; i <= maxStars; i++) {
            const isActive = i <= (rating || 0)
            
            stars.push(
                <i
                    key={i}
                    className={`${isActive ? 'fas' : 'far'} fa-star text-warning`}
                />
            )
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

    if (!book) {
        return (
            <div className="container mt-5">
                <div className="text-center">
                    <h2>Книгу не знайдено</h2>
                    <Link to="/" className="btn btn-primary">Повернутися на головну</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container mt-4">
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

            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item"><Link to="/">Головна</Link></li>
                    <li className="breadcrumb-item active">{book.title}</li>
                </ol>
            </nav>

            <div className="book-detail-container">
                <div className="row">
                    <div className="col-lg-4 col-md-5">
                        <div className="book-detail-image">
                            {book.image ? (
                                <img src={book.image} className="img-fluid rounded shadow" alt={book.title} />
                            ) : (
                                <div className="bg-light rounded p-5 text-center">
                                    <i className="fas fa-book fa-5x text-muted"></i>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="col-lg-8 col-md-7">
                        <div className="row">
                            <div className="col-lg-8">
                                <div className="book-info">
                                    <h1 className="display-6 fw-bold mb-3 text-primary">{book.title}</h1>

                                    <div className="mb-3">
                                        <h6 className="text-muted fw-semibold">Автор(и):</h6>
                                        <p className="fs-5 text-dark">{book.author?.map(a => a.name).join(', ')}</p>
                                    </div>

                                    <div className="mb-3">
                                        <h6 className="text-muted fw-semibold">Жанри:</h6>
                                        <div>
                                            {book.genres?.map(genre => (
                                                <span key={genre.id} className="badge bg-primary me-2 mb-1">
                                                    {genre.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <h6 className="text-muted fw-semibold">Рейтинг:</h6>
                                        <div className="d-flex align-items-center">
                                            {renderStars(book.average_rating || 0)}
                                            <span className="ms-2 fw-semibold">
                                                {book.average_rating ? `${book.average_rating}/5 (${book.rating_count} відгуків)` : 'Поки без рейтингу'}
                                            </span>
                                        </div>
                                    </div>

                                    {book.price && (
                                        <div className="mb-3">
                                            <h6 className="text-muted fw-semibold">Ціна:</h6>
                                            <p className="fs-3 text-success fw-bold mb-0">
                                                <i className="fas fa-hryvnia-sign"></i> {book.price} грн
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="col-lg-4">
                                <div className="book-actions-vertical">
                                    <div className="book-availability">
                                        {book.is_available ? (
                                            <div className="btn btn-success w-100 mb-3 availability-status">
                                                <i className="fas fa-check"></i> В наявності
                                            </div>
                                        ) : (
                                            <div className="btn btn-danger w-100 mb-3 availability-status">
                                                <i className="fas fa-times"></i> Немає в наявності
                                            </div>
                                        )}
                                    </div>

                                    {isLoggedIn && book.is_available && (
                                        <div className="book-action-buttons">
                                            <button
                                                onClick={buyNow}
                                                className="btn btn-soft-primary"
                                            >
                                                <i className="fas fa-shopping-bag"></i> Купити зараз
                                            </button>
                                            <button
                                                onClick={addToCart}
                                                className="btn btn-soft-success"
                                            >
                                                <i className="fas fa-shopping-cart"></i> Додати до кошика
                                            </button>
                                            <button
                                                onClick={handleWishlistToggle}
                                                className={`btn ${book.is_in_wishlist ? 'btn-soft-danger' : 'btn-outline-danger'}`}
                                            >
                                                <i className={`${book.is_in_wishlist ? 'fas' : 'far'} fa-heart`}></i>
                                                {book.is_in_wishlist ? ' В бажаному' : ' До бажаного'}
                                            </button>
                                        </div>
                                    )}

                                    {!isLoggedIn && (
                                        <div className="alert alert-info">
                                            <i className="fas fa-info-circle"></i> 
                                            <Link to="/login" className="text-decoration-none ms-1">
                                                Увійдіть в систему
                                            </Link> для покупки та додавання в бажане
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="book-detail-info mt-4">
                    <h5 className="mb-3 text-primary">
                        <i className="fas fa-info-circle"></i> Детальна інформація
                    </h5>
                    <div className="row">
                        <div className="col-md-6 col-lg-4 mb-2">
                            <small className="text-muted">Рік видання:</small>
                            <p className="fw-semibold">{book.year}</p>
                        </div>
                        {book.language && (
                            <div className="col-md-6 col-lg-4 mb-2">
                                <small className="text-muted">Мова:</small>
                                <p className="fw-semibold">{book.language}</p>
                            </div>
                        )}
                        {book.page_count && (
                            <div className="col-md-6 col-lg-4 mb-2">
                                <small className="text-muted">Кількість сторінок:</small>
                                <p className="fw-semibold">{book.page_count}</p>
                            </div>
                        )}
                        {book.publisher && (
                            <div className="col-md-6 col-lg-4 mb-2">
                                <small className="text-muted">Видавництво:</small>
                                <p className="fw-semibold">{book.publisher}</p>
                            </div>
                        )}
                        {book.book_format && (
                            <div className="col-md-6 col-lg-4 mb-2">
                                <small className="text-muted">Формат:</small>
                                <p className="fw-semibold">{book.book_format}</p>
                            </div>
                        )}
                        {book.cover_type && (
                            <div className="col-md-6 col-lg-4 mb-2">
                                <small className="text-muted">Тип обкладинки:</small>
                                <p className="fw-semibold">{book.cover_type}</p>
                            </div>
                        )}
                        {book.original_name && (
                            <div className="col-md-6 col-lg-4 mb-2">
                                <small className="text-muted">Оригінальна назва:</small>
                                <p className="fw-semibold">{book.original_name}</p>
                            </div>
                        )}
                        {book.weight && (
                            <div className="col-md-6 col-lg-4 mb-2">
                                <small className="text-muted">Вага:</small>
                                <p className="fw-semibold">{book.weight} кг</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="row mt-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h5><i className="fas fa-align-left"></i> Опис книги</h5>
                        </div>
                        <div className="card-body">
                            <p className="card-text fs-6 lh-lg">{book.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Рекомендації */}
            <div className="row mt-4">
                <div className="col-12">
                    <ContRec />
                </div>
            </div>

            {/* Компонент відгуків */}
            <Review 
                bookId={parseInt(id)} 
                onNotification={showNotification} 
            />
        </div>
    )
}

export default BookDetail