import React, { useState, useEffect, useContext } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'
import axiosInstance from '../axiosInstance'

const BookDetail = () => {
    const { id } = useParams()
    const { isLoggedIn } = useContext(AuthContext)
    const [book, setBook] = useState(null)
    const [ratings, setRatings] = useState([])
    const [userRating, setUserRating] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showRatingForm, setShowRatingForm] = useState(false)
    const [newRating, setNewRating] = useState({ score: 5, review: '' })

    useEffect(() => {
        console.log('Is logged in:', isLoggedIn)
        console.log('Access token:', localStorage.getItem('accessToken'))
        fetchBookDetails()
        fetchRatings()
        if (isLoggedIn) {
            fetchUserRating()
        }
    }, [id, isLoggedIn])

    const fetchBookDetails = async () => {
        try {
            const response = await axiosInstance.get(`/books/${id}/`)
            setBook(response.data)
            console.log('Book data:', response.data)
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
            console.log('User rating:', response.data)
        } catch (error) {
            // User hasn't rated this book yet
            setUserRating(null)
            console.log('No user rating found')
        }
    }

    const handleWishlistToggle = async () => {
        console.log('Attempting to toggle wishlist for book:', id)
        console.log('Current wishlist status:', book?.is_in_wishlist)

        try {
            const response = await axiosInstance.post('/wishlist/toggle/', { book_id: parseInt(id) })
            console.log('Wishlist response:', response.data)
            setBook(prev => ({ ...prev, is_in_wishlist: response.data.in_wishlist }))
        } catch (error) {
            console.error('Error toggling wishlist:', error.response?.data || error)
        }
    }

    const handleRatingSubmit = async (e) => {
        e.preventDefault()
        console.log('Submitting rating:', newRating)
        console.log('User rating exists:', userRating)

        try {
            let response
            if (userRating) {
                // Update existing rating
                console.log('Updating existing rating')
                response = await axiosInstance.put(`/books/${id}/rating/`, newRating)
            } else {
                // Create new rating
                console.log('Creating new rating')
                response = await axiosInstance.post(`/books/${id}/rating/`, newRating)
            }

            console.log('Rating response:', response.data)
            setShowRatingForm(false)
            fetchBookDetails()
            fetchRatings()
            fetchUserRating()
        } catch (error) {
            console.error('Error submitting rating:', error.response?.data || error)
        }
    }

    const handleDeleteRating = async () => {
        if (window.confirm('Ви впевнені, що хочете видалити свій відгук?')) {
            try {
                await axiosInstance.delete(`/books/${id}/rating/`)
                setUserRating(null)
                fetchBookDetails()
                fetchRatings()
            } catch (error) {
                console.error('Error deleting rating:', error)
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
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {isLoggedIn && (
                            <div className="mb-4">
                                <button
                                    onClick={handleWishlistToggle}
                                    className={`btn me-2 ${book.is_in_wishlist ? 'btn-danger' : 'btn-outline-danger'}`}
                                >
                                    <i className={`${book.is_in_wishlist ? 'fas' : 'far'} fa-heart`}></i>
                                    {book.is_in_wishlist ? ' В обраному' : ' Додати в обране'}
                                </button>

                                {!showRatingForm && !userRating && (
                                    <button
                                        onClick={() => setShowRatingForm(true)}
                                        className="btn btn-primary me-2"
                                    >
                                        <i className="fas fa-star"></i> Залишити відгук
                                    </button>
                                )}

                                {userRating && (
                                    <div className="d-inline">
                                        <button
                                            onClick={() => {
                                                setNewRating({ score: userRating.score, review: userRating.review })
                                                setShowRatingForm(true)
                                            }}
                                            className="btn btn-outline-primary me-2"
                                        >
                                            <i className="fas fa-edit"></i> Редагувати відгук
                                        </button>
                                        <button
                                            onClick={handleDeleteRating}
                                            className="btn btn-outline-danger"
                                        >
                                            <i className="fas fa-trash"></i> Видалити відгук
                                        </button>
                                    </div>
                                )}
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
                            <h5><i className="fas fa-info-circle"></i> Опис книги</h5>
                        </div>
                        <div className="card-body">
                            <p className="card-text">{book.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rating Form - ONLY ONE FORM HERE */}
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