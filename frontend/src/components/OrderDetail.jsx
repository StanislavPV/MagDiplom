import React, { useState, useEffect, useContext } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'
import axiosInstance from '../axiosInstance'

const OrderDetail = () => {
    const { id } = useParams()
    const { isLoggedIn } = useContext(AuthContext)
    const navigate = useNavigate()
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login')
            return
        }
        fetchOrderDetails()
    }, [id, isLoggedIn, navigate])

    const fetchOrderDetails = async () => {
        try {
            const response = await axiosInstance.get(`/orders/${id}/`)
            setOrder(response.data)
        } catch (error) {
            console.error('Error fetching order:', error)
            if (error.response?.status === 404) {
                navigate('/profile?tab=orders')
            }
        } finally {
            setLoading(false)
        }
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

    if (!order) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger text-center">
                    <h4>Замовлення не знайдено</h4>
                    <Link to="/profile?tab=orders" className="btn btn-primary">
                        Повернутися до історії покупок
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container mt-4">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item">
                        <Link to="/">Головна</Link>
                    </li>
                    <li className="breadcrumb-item">
                        <Link to="/profile?tab=orders">Історія покупок</Link>
                    </li>
                    <li className="breadcrumb-item active">
                        Замовлення #{order.order_number}
                    </li>
                </ol>
            </nav>

            {/* Order Header */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h4 className="mb-0">
                                        <i className="fas fa-receipt"></i> Замовлення #{order.order_number}
                                    </h4>
                                    <small className="text-muted">
                                        Оформлено: {new Date(order.created_at).toLocaleString('uk-UA')}
                                    </small>
                                </div>
                                <div className="text-end">
                                    <span className={`badge ${order.is_completed ? 'bg-success' : 'bg-warning'} fs-6`}>
                                        {order.is_completed ? 'Завершено' : 'В обробці'}
                                    </span>
                                    {order.completed_at && (
                                        <div className="small text-muted mt-1">
                                            Завершено: {new Date(order.completed_at).toLocaleString('uk-UA')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6">
                                    <h6 className="fw-bold">Контактна інформація:</h6>
                                    <p className="mb-1">
                                        <i className="fas fa-user"></i> {order.contact_name}
                                    </p>
                                    <p className="mb-1">
                                        <i className="fas fa-envelope"></i> {order.contact_email}
                                    </p>
                                    <p className="mb-3">
                                        <i className="fas fa-phone"></i> +380{order.contact_phone}
                                    </p>
                                    
                                    <h6 className="fw-bold">Адреса доставки:</h6>
                                    <p className="mb-0">
                                        <i className="fas fa-map-marker-alt"></i> {order.delivery_address}
                                    </p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="fw-bold">Оплата:</h6>
                                    <p className="mb-1">
                                        <i className="fas fa-credit-card"></i> {order.payment_method_display}
                                    </p>
                                    {order.card_details && (
                                        <p className="mb-3 text-muted small">
                                            Картка: ****{order.card_details}
                                        </p>
                                    )}
                                    
                                    <h6 className="fw-bold">Загальна сума:</h6>
                                    <p className="fs-4 text-success fw-bold mb-0">
                                        <i className="fas fa-hryvnia-sign"></i> {order.total_amount} грн
                                    </p>
                                    <small className="text-muted">
                                        Товарів: {order.total_items} шт.
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Items */}
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h5>
                                <i className="fas fa-box"></i> Товари в замовленні ({order.items.length})
                            </h5>
                        </div>
                        <div className="card-body">
                            {order.items.length === 0 ? (
                                <div className="text-center text-muted">
                                    <i className="fas fa-box-open fa-3x mb-3"></i>
                                    <p>Немає товарів в цьому замовленні</p>
                                </div>
                            ) : (
                                <div className="row">
                                    {order.items.map(item => (
                                        <div key={item.id} className="col-12 mb-3">
                                            <div className="card border">
                                                <div className="card-body">
                                                    <div className="row align-items-center">
                                                        <div className="col-md-2">
                                                            <Link to={`/books/${item.book}`}>
                                                                {item.book_data.image ? (
                                                                    <img
                                                                        src={item.book_data.image}
                                                                        className="img-fluid rounded"
                                                                        alt={item.book_data.title}
                                                                        style={{ maxHeight: '120px' }}
                                                                    />
                                                                ) : (
                                                                    <div className="bg-light rounded p-3 text-center">
                                                                        <i className="fas fa-book fa-3x text-muted"></i>
                                                                    </div>
                                                                )}
                                                            </Link>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <h6 className="fw-bold mb-2">
                                                                <Link 
                                                                    to={`/books/${item.book}`} 
                                                                    className="text-decoration-none"
                                                                >
                                                                    {item.book_data.title}
                                                                </Link>
                                                            </h6>
                                                            <p className="text-muted mb-1">
                                                                <i className="fas fa-user"></i> {item.book_data.author?.map(a => a.name).join(', ')}
                                                            </p>
                                                            <p className="mb-0">
                                                                <i className="fas fa-calendar"></i> {item.book_data.year}
                                                            </p>
                                                            {item.book_data.genres && (
                                                                <div className="mt-2">
                                                                    {item.book_data.genres.slice(0, 3).map(genre => (
                                                                        <span key={genre.id} className="badge bg-secondary me-1 small">
                                                                            {genre.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-md-2 text-center">
                                                            <div className="fw-bold">Кількість</div>
                                                            <div className="fs-4 text-primary">{item.quantity}</div>
                                                        </div>
                                                        <div className="col-md-2 text-end">
                                                            <div className="mb-2">
                                                                <small className="text-muted">Ціна за шт.:</small>
                                                                <div className="text-success">
                                                                    <i className="fas fa-hryvnia-sign"></i> {item.unit_price} грн
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <small className="text-muted">Загалом:</small>
                                                                <div className="fs-5 fw-bold text-success">
                                                                    <i className="fas fa-hryvnia-sign"></i> {item.total_price} грн
                                                                </div>
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
                </div>
            </div>

            {/* Order Summary */}
            <div className="row mt-4">
                <div className="col-md-6 offset-md-6">
                    <div className="card bg-light">
                        <div className="card-body">
                            <h6 className="card-title">Підсумок замовлення</h6>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Кількість товарів:</span>
                                <span>{order.total_items}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Вартість товарів:</span>
                                <span>
                                    <i className="fas fa-hryvnia-sign"></i> {order.total_amount} грн
                                </span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Доставка:</span>
                                <span className="text-success">Безкоштовно</span>
                            </div>
                            <hr />
                            <div className="d-flex justify-content-between">
                                <span className="fw-bold fs-5">Загалом:</span>
                                <span className="fw-bold fs-5 text-success">
                                    <i className="fas fa-hryvnia-sign"></i> {order.total_amount} грн
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="row mt-4 mb-4">
                <div className="col-12 text-center">
                    <Link to="/profile?tab=orders" className="btn btn-outline-primary me-2">
                        <i className="fas fa-arrow-left"></i> Назад до історії
                    </Link>
                    <Link to="/" className="btn btn-primary">
                        <i className="fas fa-home"></i> На головну
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default OrderDetail