import React, { useState, useEffect, useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'
import axiosInstance from '../axiosInstance'

const Profile = () => {
    const { isLoggedIn } = useContext(AuthContext)
    const location = useLocation()
    const [activeTab, setActiveTab] = useState('wishlist')
    const [wishlist, setWishlist] = useState([])
    const [ratings, setRatings] = useState([])
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)

    useEffect(() => {
        // Check URL for tab parameter
        const params = new URLSearchParams(location.search)
        const tab = params.get('tab')
        if (tab && ['wishlist', 'ratings', 'orders'].includes(tab)) {
            setActiveTab(tab)
        }

        if (isLoggedIn) {
            fetchUserData()
            fetchWishlist()
            fetchMyRatings()
            fetchOrders()
        }
    }, [isLoggedIn, location.search])

    const fetchUserData = async () => {
        try {
            const response = await axiosInstance.get('/protected-view/')
            setUser(response.data.user)
        } catch (error) {
            console.error('Error fetching user data:', error)
        }
    }

    const fetchWishlist = async () => {
        try {
            const response = await axiosInstance.get('/wishlist/')
            setWishlist(response.data)
        } catch (error) {
            console.error('Error fetching wishlist:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchMyRatings = async () => {
        try {
            const response = await axiosInstance.get('/my-ratings/')
            setRatings(response.data.results || response.data)
        } catch (error) {
            console.error('Error fetching ratings:', error)
        }
    }

    const fetchOrders = async () => {
        try {
            const response = await axiosInstance.get('/orders/')
            setOrders(response.data.results || response.data)
        } catch (error) {
            console.error('Error fetching orders:', error)
        }
    }

    const removeFromWishlist = async (bookId) => {
        try {
            const wishlistItem = wishlist.find(item => item.book.id === bookId)
            if (wishlistItem) {
                await axiosInstance.delete(`/wishlist/${wishlistItem.id}/`)
                setWishlist(prev => prev.filter(item => item.book.id !== bookId))
            }
        } catch (error) {
            console.error('Error removing from wishlist:', error)
        }
    }

    const renderStars = (rating) => {
        const stars = []
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <i
                    key={i}
                    className={`${i <= rating ? 'fas' : 'far'} fa-star text-warning`}
                ></i>
            )
        }
        return stars
    }

    if (!isLoggedIn) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning text-center">
                    <h4>Увійдіть в акаунт</h4>
                    <p>Щоб переглянути профіль, спочатку увійдіть в систему</p>
                    <Link to="/login" className="btn btn-primary">Увійти</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container mt-4">
            {/* Profile Header */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className="me-3">
                                    <i className="fas fa-user-circle fa-3x text-primary"></i>
                                </div>
                                <div>
                                    <h4 className="mb-1">{user?.name || 'Ваш профіль'}</h4>
                                    <p className="text-muted mb-0">{user?.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="row">
                <div className="col-12">
                    <ul className="nav nav-tabs mb-4">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'wishlist' ? 'active' : ''}`}
                                onClick={() => setActiveTab('wishlist')}
                            >
                                <i className="fas fa-heart"></i> Обране ({wishlist.length})
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'ratings' ? 'active' : ''}`}
                                onClick={() => setActiveTab('ratings')}
                            >
                                <i className="fas fa-star"></i> Мої відгуки ({ratings.length})
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`}
                                onClick={() => setActiveTab('orders')}
                            >
                                <i className="fas fa-shopping-bag"></i> Історія покупок ({orders.length})
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Tab Content */}
            <div className="row">
                <div className="col-12">
                    {activeTab === 'wishlist' && (
                        <div className="card">
                            <div className="card-header">
                                <h5><i className="fas fa-heart"></i> Список бажань</h5>
                            </div>
                            <div className="card-body">
                                {loading ? (
                                    <div className="text-center">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Завантаження...</span>
                                        </div>
                                    </div>
                                ) : wishlist.length === 0 ? (
                                    <div className="text-center">
                                        <i className="fas fa-heart fa-3x text-muted mb-3"></i>
                                        <h5 className="text-muted">Ваш список бажань порожній</h5>
                                        <p>Додайте книги до списку бажань, щоб переглядати їх тут</p>
                                        <Link to="/" className="btn btn-primary">Переглянути книги</Link>
                                    </div>
                                ) : (
                                    <div className="row">
                                        {wishlist.map(item => (
                                            <div key={item.id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
                                                <div className="card h-100 shadow-sm">
                                                    <div className="card-img-wrapper">
                                                        {item.book.image ? (
                                                            <img
                                                                src={item.book.image}
                                                                className="card-img-top book-cover"
                                                                alt={item.book.title}
                                                            />
                                                        ) : (
                                                            <div className="card-img-top book-cover-placeholder d-flex align-items-center justify-content-center">
                                                                <i className="fas fa-book fa-3x text-muted"></i>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="card-body d-flex flex-column">
                                                        <h6 className="card-title fw-bold">{item.book.title}</h6>
                                                        <p className="text-muted small">
                                                            {item.book.author?.map(a => a.name).join(', ')}
                                                        </p>
                                                        <div className="mt-auto">
                                                            <div className="d-grid gap-2">
                                                                <Link
                                                                    to={`/books/${item.book.id}`}
                                                                    className="btn btn-primary btn-sm"
                                                                >
                                                                    <i className="fas fa-eye"></i> Переглянути
                                                                </Link>
                                                                <button
                                                                    onClick={() => removeFromWishlist(item.book.id)}
                                                                    className="btn btn-outline-danger btn-sm"
                                                                >
                                                                    <i className="fas fa-trash"></i> Видалити
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'ratings' && (
                        <div className="card">
                            <div className="card-header">
                                <h5><i className="fas fa-star"></i> Мої відгуки</h5>
                            </div>
                            <div className="card-body">
                                {ratings.length === 0 ? (
                                    <div className="text-center">
                                        <i className="fas fa-star fa-3x text-muted mb-3"></i>
                                        <h5 className="text-muted">У вас поки немає відгуків</h5>
                                        <p>Залиште відгук про прочитані книги</p>
                                        <Link to="/" className="btn btn-primary">Переглянути книги</Link>
                                    </div>
                                ) : (
                                    <div className="row">
                                        {ratings.map(rating => (
                                            <div key={rating.id} className="col-12 mb-3">
                                                <div className="card">
                                                    <div className="card-body">
                                                        <div className="row">
                                                            <div className="col-md-2">
                                                                {rating.book_image ? (
                                                                    <img
                                                                        src={rating.book_image}
                                                                        className="img-fluid rounded"
                                                                        alt={rating.book_title}
                                                                    />
                                                                ) : (
                                                                    <div className="bg-light rounded p-3 text-center">
                                                                        <i className="fas fa-book fa-2x text-muted"></i>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="col-md-10">
                                                                <div className="d-flex justify-content-between align-items-start">
                                                                    <div>
                                                                        <h6 className="fw-bold">{rating.book_title}</h6>
                                                                        <div className="mb-2">
                                                                            {renderStars(rating.score)}
                                                                            <span className="ms-2 text-muted">
                                                                                {rating.score}/5
                                                                            </span>
                                                                        </div>
                                                                        {rating.review && (
                                                                            <p className="mb-2">{rating.review}</p>
                                                                        )}
                                                                        <small className="text-muted">
                                                                            {new Date(rating.created_at).toLocaleDateString('uk-UA')}
                                                                        </small>
                                                                    </div>
                                                                    <Link
                                                                        to={`/books/${rating.book}`}
                                                                        className="btn btn-outline-primary btn-sm"
                                                                    >
                                                                        Переглянути книгу
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="card">
                            <div className="card-header">
                                <h5><i className="fas fa-shopping-bag"></i> Історія покупок</h5>
                            </div>
                            <div className="card-body">
                                {orders.length === 0 ? (
                                    <div className="text-center">
                                        <i className="fas fa-shopping-bag fa-3x text-muted mb-3"></i>
                                        <h5 className="text-muted">У вас поки немає замовлень</h5>
                                        <p>Зробіть свою першу покупку</p>
                                        <Link to="/" className="btn btn-primary">Переглянути книги</Link>
                                    </div>
                                ) : (
                                    <div className="row">
                                        {orders.map(order => (
                                            <div key={order.id} className="col-12 mb-3">
                                                <div className="card">
                                                    <div className="card-header d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <h6 className="mb-0">
                                                                Замовлення #{order.order_number}
                                                            </h6>
                                                            <small className="text-muted">
                                                                {new Date(order.created_at).toLocaleDateString('uk-UA')}
                                                            </small>
                                                        </div>
                                                        <div className="text-end">
                                                            <span className="badge bg-success">
                                                                {order.payment_method_display}
                                                            </span>
                                                            <div className="fw-bold text-success">
                                                                <i className="fas fa-hryvnia-sign"></i> {order.total_amount} грн
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="card-body">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <span>
                                                                Товарів: <strong>{order.total_items}</strong>
                                                            </span>
                                                            <Link
                                                                to={`/orders/${order.id}`}
                                                                className="btn btn-outline-primary btn-sm"
                                                            >
                                                                <i className="fas fa-eye"></i> Деталі
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Profile