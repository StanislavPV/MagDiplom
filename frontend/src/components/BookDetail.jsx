import React, { useState, useEffect, useContext, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'
import axiosInstance from '../axiosInstance'

const BookDetail = () => {
    const { id } = useParams()
    const { isLoggedIn } = useContext(AuthContext)
    const navigate = useNavigate()
    const [book, setBook] = useState(null)
    const [ratings, setRatings] = useState([])
    const [userRating, setUserRating] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showRatingForm, setShowRatingForm] = useState(false)
    const [newRating, setNewRating] = useState({ score: 5, review: '' })
    const [notification, setNotification] = useState(null)
    const [visibleRatingsCount, setVisibleRatingsCount] = useState(5)
    const ratingFormRef = useRef(null)

    useEffect(() => {
        fetchBookDetails()
        fetchRatings()
        if (isLoggedIn) {
            fetchUserRating()
        }
    }, [id, isLoggedIn])

    // Auto-hide notification after 3 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [notification])

    // Scroll to rating form when it's shown
    useEffect(() => {
        if (showRatingForm && ratingFormRef.current) {
            ratingFormRef.current.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            })
        }
    }, [showRatingForm])

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type })
    }

    const fetchBookDetails = async () => {
        try {
            const response = await axiosInstance.get(`/books/${id}/`)
            setBook(response.data)
        } catch (error) {
            console.error('Error fetching book:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchRatings = async () => {
        try {
            const response = await axiosInstance.get(`/books/${id}/ratings/`)
            setRatings(response.data.results || response.data)
        } catch (error) {
            console.error('Error fetching ratings:', error)
        }
    }

    const fetchUserRating = async () => {
        try {
            const response = await axiosInstance.get(`/books/${id}/rating/`)
            setUserRating(response.data)
        } catch (error) {
            setUserRating(null)
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
                book: parseInt(id),
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
                book: parseInt(id),
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
        try {
            const response = await axiosInstance.post('/wishlist/toggle/', { book_id: parseInt(id) })
            setBook(prev => ({ ...prev, is_in_wishlist: response.data.in_wishlist }))
            showNotification(
                response.data.in_wishlist ? '❤️ Додано до бажаного' : '💔 Видалено з бажаного',
                'success'
            )
        } catch (error) {
            console.error('Error toggling wishlist:', error)
            showNotification('❌ Помилка при оновленні списку бажань', 'error')
        }
    }

    const handleRatingSubmit = async (e) => {
        e.preventDefault()

        try {
            let response
            if (userRating) {
                response = await axiosInstance.put(`/books/${id}/rating/`, newRating)
            } else {
                response = await axiosInstance.post(`/books/${id}/rating/`, newRating)
            }

            setShowRatingForm(false)
            fetchBookDetails()
            fetchRatings()
            fetchUserRating()
            showNotification('✅ Відгук успішно збережено!', 'success')
        } catch (error) {
            console.error('Error submitting rating:', error)
            showNotification('❌ Помилка при збереженні відгуку', 'error')
        }
    }

    const handleDeleteRating = async () => {
        if (window.confirm('Ви впевнені, що хочете видалити свій відгук?')) {
            try {
                await axiosInstance.delete(`/books/${id}/rating/`)
                setUserRating(null)
                fetchBookDetails()
                fetchRatings()
                showNotification('🗑️ Відгук видалено', 'info')
            } catch (error) {
                console.error('Error deleting rating:', error)
                showNotification('❌ Помилка при видаленні відгуку', 'error')
            }
        }
    }

    const renderStars = (rating, interactive = false, onStarClick = null) => {
        const stars = []
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <i
                    key={i}
                    className={`${i <= rating ? 'fas' : 'far'} fa-star text-warning ${interactive ? 'rating-star' : ''}`}
                    onClick={interactive ? () => onStarClick(i) : undefined}
                    style={interactive ? { cursor: 'pointer' } : {}}
                ></i>
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
                <div className="alert alert-danger text-center">
                    <h4>Книгу не знайдено</h4>
                    <Link to="/" className="btn btn-primary">Повернутися до каталогу</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container mt-4">
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

            {/* Breadcrumb */}
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item"><Link to="/">Головна</Link></li>
                    <li className="breadcrumb-item active">{book.title}</li>
                </ol>
            </nav>

            {/* Book Details */}
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
                            {/* Left column - Book info */}
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

                            {/* Right column - Action buttons */}
                            <div className="col-lg-4">
                                <div className="book-actions-vertical">
                                    {/* Availability status - однаковий розмір з кнопками */}
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

                                    {/* Action Buttons */}
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

                                    {/* Login prompt for guests */}
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

                {/* Book Details Information */}
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
                        {book.isbn && (
                            <div className="col-md-6 col-lg-4 mb-2">
                                <small className="text-muted">ISBN:</small>
                                <p className="fw-semibold">{book.isbn}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Description */}
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

            {/* Rating Form */}
            {isLoggedIn && showRatingForm && (
                <div className="row mt-4" ref={ratingFormRef}>
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header">
                                <h5>
                                    <i className="fas fa-star"></i>
                                    {userRating ? ' Редагувати відгук' : ' Залишити відгук'}
                                </h5>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleRatingSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Оцінка:</label>
                                        <div className="rating-input">
                                            {renderStars(newRating.score, true, (score) =>
                                                setNewRating(prev => ({ ...prev, score }))
                                            )}
                                            <span className="ms-2 fw-semibold">({newRating.score}/5)</span>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Відгук (необов'язково):</label>
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            value={newRating.review}
                                            onChange={(e) => setNewRating(prev => ({ ...prev, review: e.target.value }))}
                                            placeholder="Поділіться своїми враженнями про книгу..."
                                        ></textarea>
                                    </div>
                                    <div>
                                        <button type="submit" className="btn btn-soft-primary me-2">
                                            <i className="fas fa-save"></i>
                                            {userRating ? ' Оновити відгук' : ' Залишити відгук'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowRatingForm(false)}
                                            className="btn btn-secondary"
                                        >
                                            <i className="fas fa-times"></i> Скасувати
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reviews Section */}
            <div className="row mt-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0"><i className="fas fa-comments"></i> Відгуки ({ratings.length})</h5>
                            
                            {/* Rating actions moved here */}
                            {isLoggedIn && (
                                <div className="rating-actions">
                                    {!showRatingForm && !userRating && (
                                        <button
                                            onClick={() => setShowRatingForm(true)}
                                            className="btn btn-soft-primary btn-sm"
                                        >
                                            <i className="fas fa-star"></i> Залишити відгук
                                        </button>
                                    )}

                                    {userRating && (
                                        <div className="dropdown">
                                            <button
                                                className="btn btn-soft-primary btn-sm dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                            >
                                                <i className="fas fa-edit"></i> Мій відгук
                                            </button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <button
                                                        className="dropdown-item"
                                                        onClick={() => {
                                                            setNewRating({ score: userRating.score, review: userRating.review })
                                                            setShowRatingForm(true)
                                                        }}
                                                    >
                                                        <i className="fas fa-edit me-2"></i>Редагувати
                                                    </button>
                                                </li>
                                                <li>
                                                    <button
                                                        className="dropdown-item text-danger"
                                                        onClick={handleDeleteRating}
                                                    >
                                                        <i className="fas fa-trash me-2"></i>Видалити
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="card-body">
                            {ratings.length === 0 ? (
                                <div className="empty-state">
                                    <i className="fas fa-comments fa-3x"></i>
                                    <h4>Поки що немає відгуків</h4>
                                    <p>Будьте першим, хто залишить відгук про цю книгу!</p>
                                </div>
                            ) : (
                                <>
                                    {ratings.slice(0, visibleRatingsCount).map(rating => (
                                        <div key={rating.id} className="border-bottom pb-3 mb-3">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <div className="d-flex align-items-center mb-2">
                                                        <strong className="me-2 text-primary">{rating.user_name}</strong>
                                                        <div className="me-2">
                                                            {renderStars(rating.score)}
                                                        </div>
                                                        <small className="text-muted">
                                                            {new Date(rating.created_at).toLocaleDateString('uk-UA')}
                                                        </small>
                                                    </div>
                                                    {rating.review && (
                                                        <p className="mb-0 text-dark">{rating.review}</p>
                                                    )}
                                                </div>
                                                {rating.is_own_rating && (
                                                    <span className="badge bg-primary">Ваш відгук</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Кнопка "Показати ще" */}
                                    {ratings.length > visibleRatingsCount && (
                                        <div className="text-center mt-3">
                                            <button
                                                onClick={() => setVisibleRatingsCount(prev => prev + 5)}
                                                className="btn btn-outline-primary"
                                            >
                                                <i className="fas fa-chevron-down me-2"></i>
                                                Показати ще ({ratings.length - visibleRatingsCount} відгуків)
                                            </button>
                                        </div>
                                    )}
                                    
                                    {/* Кнопка "Показати менше" якщо показано більше 5 */}
                                    {visibleRatingsCount > 5 && ratings.length > 5 && (
                                        <div className="text-center mt-2">
                                            <button
                                                onClick={() => setVisibleRatingsCount(5)}
                                                className="btn btn-outline-secondary btn-sm"
                                            >
                                                <i className="fas fa-chevron-up me-2"></i>
                                                Показати менше
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BookDetail