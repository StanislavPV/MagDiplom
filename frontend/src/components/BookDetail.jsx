import React, { useState, useEffect, useContext } from 'react'
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
            // Спочатку додаємо книжку до кошика
            await axiosInstance.post('/cart/add/', {
                book: parseInt(id),
                quantity: 1
            })
            
            // Оновлюємо кошик в хедері
            window.dispatchEvent(new CustomEvent('cartUpdated'))
            
            // Показуємо повідомлення
            showNotification('✅ Книгу додано до кошика!', 'success')
            
            // Переходимо до оформлення замовлення (тепер з кошика)
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
                response.data.in_wishlist ? '❤️ Додано до обраного' : '💔 Видалено з обраного',
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
            <div className="row">
                <div className="col-md-4">
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

                <div className="col-md-8">
                    <div className="book-info">
                        <h1 className="display-6 fw-bold mb-3">{book.title}</h1>

                        <div className="mb-3">
                            <h6 className="text-muted">Автор(и):</h6>
                            <p className="fs-5">{book.author?.map(a => a.name).join(', ')}</p>
                        </div>

                        <div className="mb-3">
                            <h6 className="text-muted">Жанри:</h6>
                            <div>
                                {book.genres?.map(genre => (
                                    <span key={genre.id} className="badge bg-primary me-2 mb-1">
                                        {genre.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="mb-3">
                            <h6 className="text-muted">Рейтинг:</h6>
                            <div className="d-flex align-items-center">
                                {renderStars(book.average_rating || 0)}
                                <span className="ms-2">
                                    {book.average_rating ? `${book.average_rating}/5 (${book.rating_count} відгуків)` : 'Поки без рейтингу'}
                                </span>
                            </div>
                        </div>

                        {book.price && (
                            <div className="mb-3">
                                <h6 className="text-muted">Ціна:</h6>
                                <p className="fs-4 text-success fw-bold">
                                    <i className="fas fa-hryvnia-sign"></i> {book.price} грн
                                </p>
                            </div>
                        )}

                        <div className="mb-4">
                            <div className="row">
                                <div className="col-sm-6 mb-2">
                                    <small className="text-muted">Рік видання:</small>
                                    <p>{book.year}</p>
                                </div>
                                {book.language && (
                                    <div className="col-sm-6 mb-2">
                                        <small className="text-muted">Мова:</small>
                                        <p>{book.language}</p>
                                    </div>
                                )}
                                {book.page_count && (
                                    <div className="col-sm-6 mb-2">
                                        <small className="text-muted">Кількість сторінок:</small>
                                        <p>{book.page_count}</p>
                                    </div>
                                )}
                                {book.publisher && (
                                    <div className="col-sm-6 mb-2">
                                        <small className="text-muted">Видавництво:</small>
                                        <p>{book.publisher}</p>
                                    </div>
                                )}
                                {book.book_format && (
                                    <div className="col-sm-6 mb-2">
                                        <small className="text-muted">Формат:</small>
                                        <p>{book.book_format}</p>
                                    </div>
                                )}
                                {book.cover_type && (
                                    <div className="col-sm-6 mb-2">
                                        <small className="text-muted">Тип обкладинки:</small>
                                        <p>{book.cover_type}</p>
                                    </div>
                                )}
                                {book.original_name && (
                                    <div className="col-sm-6 mb-2">
                                        <small className="text-muted">Оригінальна назва:</small>
                                        <p>{book.original_name}</p>
                                    </div>
                                )}
                                {book.weight && (
                                    <div className="col-sm-6 mb-2">
                                        <small className="text-muted">Вага:</small>
                                        <p>{book.weight} кг</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mb-4">
                            {/* Shopping Buttons - only if book is available and user is logged in */}
                            {isLoggedIn && book.is_available && (
                                <div className="d-grid gap-2 d-md-flex mb-3">
                                    <button
                                        onClick={addToCart}
                                        className="btn btn-success btn-lg me-md-2"
                                    >
                                        <i className="fas fa-cart-plus"></i> До кошика
                                    </button>
                                    <button
                                        onClick={buyNow}
                                        className="btn btn-primary btn-lg"
                                    >
                                        <i className="fas fa-bolt"></i> Купити зараз
                                    </button>
                                </div>
                            )}

                            {/* Availability status */}
                            <div className="mb-3">
                                {book.is_available ? (
                                    <span className="badge bg-success fs-6">
                                        <i className="fas fa-check"></i> В наявності
                                    </span>
                                ) : (
                                    <span className="badge bg-danger fs-6">
                                        <i className="fas fa-times"></i> Немає в наявності
                                    </span>
                                )}
                            </div>

                            {/* Other action buttons */}
                            {isLoggedIn && (
                                <div className="d-flex flex-wrap gap-2">
                                    <button
                                        onClick={handleWishlistToggle}
                                        className={`btn ${book.is_in_wishlist ? 'btn-danger' : 'btn-outline-danger'}`}
                                    >
                                        <i className={`${book.is_in_wishlist ? 'fas' : 'far'} fa-heart`}></i>
                                        {book.is_in_wishlist ? ' В обраному' : ' Додати в обране'}
                                    </button>

                                    {!showRatingForm && !userRating && (
                                        <button
                                            onClick={() => setShowRatingForm(true)}
                                            className="btn btn-outline-primary"
                                        >
                                            <i className="fas fa-star"></i> Залишити відгук
                                        </button>
                                    )}

                                    {userRating && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setNewRating({ score: userRating.score, review: userRating.review })
                                                    setShowRatingForm(true)
                                                }}
                                                className="btn btn-outline-primary"
                                            >
                                                <i className="fas fa-edit"></i> Редагувати відгук
                                            </button>
                                            <button
                                                onClick={handleDeleteRating}
                                                className="btn btn-outline-danger"
                                            >
                                                <i className="fas fa-trash"></i> Видалити відгук
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Login prompt for guests */}
                            {!isLoggedIn && (
                                <div className="alert alert-info">
                                    <i className="fas fa-info-circle"></i> 
                                    <Link to="/login" className="text-decoration-none ms-1">
                                        Увійдіть в систему
                                    </Link> для покупки та додавання в обране
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="row mt-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h5><i className="fas fa-info-circle"></i> Опис книги</h5>
                        </div>
                        <div className="card-body">
                            <p className="card-text">{book.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rating Form */}
            {isLoggedIn && showRatingForm && (
                <div className="row mt-4">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header">
                                <h5>{userRating ? 'Редагувати відгук' : 'Залишити відгук'}</h5>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleRatingSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Оцінка:</label>
                                        <div className="rating-input">
                                            {renderStars(newRating.score, true, (score) =>
                                                setNewRating(prev => ({ ...prev, score }))
                                            )}
                                            <span className="ms-2">({newRating.score}/5)</span>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Відгук (необов'язково):</label>
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            value={newRating.review}
                                            onChange={(e) => setNewRating(prev => ({ ...prev, review: e.target.value }))}
                                            placeholder="Поділіться своїми враженнями про книгу..."
                                        ></textarea>
                                    </div>
                                    <div>
                                        <button type="submit" className="btn btn-primary me-2">
                                            {userRating ? 'Оновити відгук' : 'Залишити відгук'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowRatingForm(false)}
                                            className="btn btn-secondary"
                                        >
                                            Скасувати
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
                            <h5><i className="fas fa-comments"></i> Відгуки ({ratings.length})</h5>
                            {isLoggedIn && !userRating && !showRatingForm && (
                                <button
                                    onClick={() => setShowRatingForm(true)}
                                    className="btn btn-success btn-sm"
                                >
                                    <i className="fas fa-star"></i> Залишити відгук
                                </button>
                            )}
                        </div>
                        <div className="card-body">
                            {ratings.length === 0 ? (
                                <p className="text-muted text-center">Поки що немає відгуків. Будьте першим!</p>
                            ) : (
                                ratings.map(rating => (
                                    <div key={rating.id} className="border-bottom pb-3 mb-3">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <div className="d-flex align-items-center mb-2">
                                                    <strong className="me-2">{rating.user_name}</strong>
                                                    <div className="me-2">
                                                        {renderStars(rating.score)}
                                                    </div>
                                                    <small className="text-muted">
                                                        {new Date(rating.created_at).toLocaleDateString('uk-UA')}
                                                    </small>
                                                </div>
                                                {rating.review && (
                                                    <p className="mb-0">{rating.review}</p>
                                                )}
                                            </div>
                                            {rating.is_own_rating && (
                                                <span className="badge bg-primary">Ваш відгук</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BookDetail