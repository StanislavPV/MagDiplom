import { useState, useEffect, useContext, useRef } from 'react'
import axiosInstance from '../axiosInstance'
import { AuthContext } from '../AuthProvider'

const Review = ({ bookId, onNotification }) => {
    const { isLoggedIn } = useContext(AuthContext)
    const [ratings, setRatings] = useState([])
    const [userRating, setUserRating] = useState(null)
    const [showRatingForm, setShowRatingForm] = useState(false)
    const [newRating, setNewRating] = useState({ score: 5, review: '' })
    const [visibleRatingsCount, setVisibleRatingsCount] = useState(5)
    const ratingFormRef = useRef(null)

    useEffect(() => {
        if (bookId) {
            fetchRatings()
            if (isLoggedIn) {
                fetchUserRating()
            }
        }
    }, [bookId, isLoggedIn])

    // Scroll to rating form when it's shown
    useEffect(() => {
        if (showRatingForm && ratingFormRef.current) {
            ratingFormRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [showRatingForm])

    const fetchRatings = async () => {
        try {
            const response = await axiosInstance.get(`/books/${bookId}/ratings/`)
            setRatings(response.data)
        } catch (error) {
            console.error('Error fetching ratings:', error)
        }
    }

    const fetchUserRating = async () => {
        try {
            const response = await axiosInstance.get(`/books/${bookId}/rating/`)
            if (response.data) {
                setUserRating(response.data)
                setNewRating({
                    score: response.data.score,
                    review: response.data.review || ''
                })
            }
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error('Error fetching user rating:', error)
            }
        }
    }

    const handleRatingSubmit = async (e) => {
        e.preventDefault()
        
        try {
            if (userRating) {
                // Update existing rating
                await axiosInstance.put(`/ratings/${userRating.id}/`, {
                    book: bookId,
                    score: newRating.score,
                    review: newRating.review
                })
                onNotification('✅ Відгук оновлено!', 'success')
            } else {
                // Create new rating
                await axiosInstance.post('/ratings/', {
                    book: bookId,
                    score: newRating.score,
                    review: newRating.review
                })
                onNotification('✅ Відгук додано!', 'success')
            }

            setShowRatingForm(false)
            fetchRatings()
            fetchUserRating()
            
            // Повідомляємо батьківський компонент про оновлення
            if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('ratingUpdated'))
            }
        } catch (error) {
            console.error('Error submitting rating:', error)
            onNotification('❌ Помилка при відправці відгуку', 'error')
        }
    }

    const handleDeleteRating = async () => {
        if (!userRating) return

        if (window.confirm('Ви впевнені, що хочете видалити свій відгук?')) {
            try {
                await axiosInstance.delete(`/ratings/${userRating.id}/delete/`)
                onNotification('✅ Відгук видалено!', 'success')
                setUserRating(null)
                setNewRating({ score: 5, review: '' })
                setShowRatingForm(false)
                fetchRatings()
                
                // Повідомляємо батьківський компонент про оновлення
                if (window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('ratingUpdated'))
                }
            } catch (error) {
                console.error('Error deleting rating:', error)
                onNotification('❌ Помилка при видаленні відгуку', 'error')
            }
        }
    }

    const renderStars = (rating, interactive = false, onStarClick = null) => {
        const stars = []
        const maxStars = 5
        
        for (let i = 1; i <= maxStars; i++) {
            const isActive = i <= (rating || 0)
            
            stars.push(
                <i
                    key={i}
                    className={`${isActive ? 'fas' : 'far'} fa-star ${interactive ? 'rating-star' : ''} text-warning`}
                    style={{ cursor: interactive ? 'pointer' : 'default' }}
                    onClick={interactive && onStarClick ? () => onStarClick(i) : undefined}
                />
            )
        }
        
        return stars
    }

    return (
        <>
            {/* Форма додавання/редагування відгуку */}
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

            {/* Список відгуків */}
            <div className="row mt-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0"><i className="fas fa-comments"></i> Відгуки ({ratings.length})</h5>
                            
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
                                                            setNewRating({
                                                                score: userRating.score,
                                                                review: userRating.review || ''
                                                            })
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
                                                <div className="flex-grow-1">
                                                    <div className="d-flex align-items-center mb-2">
                                                        <strong className="me-2 text-primary">{rating.user_name}</strong>
                                                        <div className="me-2">
                                                            {renderStars(rating.score)}
                                                        </div>
                                                        <small className="text-muted me-2">
                                                            {new Date(rating.created_at).toLocaleDateString('uk-UA')}
                                                        </small>
                                                        {/* Мітка покупки */}
                                                        {rating.purchased_on_site ? (
                                                            <span className="badge bg-success">
                                                                <i className="fas fa-check-circle me-1"></i>
                                                                Куплено у нас
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-secondary">
                                                                <i className="fas fa-store me-1"></i>
                                                                Куплено в іншому місці
                                                            </span>
                                                        )}
                                                    </div>
                                                    {rating.review && (
                                                        <p className="mb-0 text-dark">{rating.review}</p>
                                                    )}
                                                </div>
                                                {rating.is_own_rating && (
                                                    <span className="badge bg-primary ms-2">Ваш відгук</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
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
        </>
    )
}

export default Review