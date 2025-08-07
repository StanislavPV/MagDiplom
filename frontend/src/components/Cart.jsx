import React, { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'
import axiosInstance from '../axiosInstance'

const Cart = () => {
  const { isLoggedIn } = useContext(AuthContext)
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    if (isLoggedIn) {
      fetchCart()
    } else {
      navigate('/login')
    }
  }, [isLoggedIn, navigate])

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

  const fetchCart = async () => {
    try {
      const response = await axiosInstance.get('/cart/')
      setCart(response.data)
      // Dispatch cart update event to update header
      window.dispatchEvent(new CustomEvent('cartUpdated'))
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return

    try {
      await axiosInstance.put(`/cart/items/${itemId}/`, {
        quantity: newQuantity
      })
      fetchCart() // This will now trigger header update
      showNotification('✅ Кількість оновлено', 'success')
    } catch (error) {
      console.error('Error updating quantity:', error)
      showNotification('❌ Помилка при оновленні кількості', 'error')
    }
  }

  const removeItem = async (itemId) => {
    try {
      await axiosInstance.delete(`/cart/items/${itemId}/remove/`)
      fetchCart() // This will now trigger header update
      showNotification('🗑️ Товар видалено з кошика', 'info')
    } catch (error) {
      console.error('Error removing item:', error)
      showNotification('❌ Помилка при видаленні товару', 'error')
    }
  }

  const clearCart = async () => {
    if (window.confirm('Очистити весь кошик?')) {
      try {
        await axiosInstance.delete('/cart/clear/')
        fetchCart() // This will now trigger header update
        showNotification('🗑️ Кошик очищено', 'info')
      } catch (error) {
        console.error('Error clearing cart:', error)
        showNotification('❌ Помилка при очищенні кошика', 'error')
      }
    }
  }

  const proceedToCheckout = () => {
    navigate('/checkout')
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
    <div className="container mt-4">
      {/* Notification Toast */}
      {notification && (
        <div className={`alert alert-${notification.type === 'success' ? 'success' : notification.type === 'error' ? 'danger' : 'info'} alert-dismissible fade show position-fixed`} 
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
          <h2>🛒 Мій кошик</h2>
        </div>
      </div>

      {!cart || cart.items.length === 0 ? (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="fas fa-shopping-cart fa-5x text-muted mb-3"></i>
                <h4 className="text-muted">Ваш кошик порожній</h4>
                <p className="text-muted">Додайте книги до кошика, щоб продовжити покупки</p>
                <Link to="/" className="btn btn-primary">
                  <i className="fas fa-book"></i> Переглянути книги
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="row mt-4">
            <div className="col-lg-8">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5>Товари в кошику ({cart.total_items})</h5>
                  <button onClick={clearCart} className="btn btn-outline-danger btn-sm">
                    <i className="fas fa-trash"></i> Очистити кошик
                  </button>
                </div>
                <div className="card-body">
                  {cart.items.map(item => (
                    <div key={item.id} className="row border-bottom pb-3 mb-3">
                      <div className="col-md-2">
                        <Link to={`/books/${item.book}`}>
                          {item.book_data.image ? (
                            <img
                              src={item.book_data.image}
                              className="img-fluid rounded"
                              alt={item.book_data.title}
                              style={{ maxHeight: '100px' }}
                            />
                          ) : (
                            <div className="bg-light rounded p-3 text-center">
                              <i className="fas fa-book fa-2x text-muted"></i>
                            </div>
                          )}
                        </Link>
                      </div>
                      <div className="col-md-6">
                        <h6 className="fw-bold">
                          <Link to={`/books/${item.book}`} className="text-decoration-none">
                            {item.book_data.title}
                          </Link>
                        </h6>
                        <p className="text-muted small mb-1">
                          {item.book_data.author?.map(a => a.name).join(', ')}
                        </p>
                        <p className="text-success fw-bold mb-0">
                          <i className="fas fa-hryvnia-sign"></i> {item.book_data.price} грн
                        </p>
                      </div>
                      <div className="col-md-2">
                        <div className="input-group input-group-sm">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="form-control text-center"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            min="1"
                          />
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="col-md-2 text-end">
                        <p className="fw-bold mb-2">
                          <i className="fas fa-hryvnia-sign"></i> {item.total_price} грн
                        </p>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="btn btn-outline-danger btn-sm"
                          title="Видалити з кошика"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card">
                <div className="card-header">
                  <h5>Загальна сума</h5>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Кількість товарів:</span>
                    <span>{cart.total_items}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Загальна вартість:</span>
                    <span className="fw-bold">
                      <i className="fas fa-hryvnia-sign"></i> {cart.total_price} грн
                    </span>
                  </div>
                  <hr />
                  <div className="d-grid gap-2">
                    <button
                      onClick={proceedToCheckout}
                      className="btn btn-success btn-lg"
                    >
                      <i className="fas fa-credit-card"></i> Оформити замовлення
                    </button>
                    <Link to="/" className="btn btn-outline-primary">
                      <i className="fas fa-arrow-left"></i> Продовжити покупки
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Cart