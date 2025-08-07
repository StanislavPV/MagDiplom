import React, { useState, useEffect, useContext } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'
import axiosInstance from '../axiosInstance'

const Checkout = () => {
  const { isLoggedIn } = useContext(AuthContext)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState({})
  const [cart, setCart] = useState(null)
  const [orderData, setOrderData] = useState({
    contact_email: '',
    contact_phone: '',
    contact_name: '',
    delivery_address: '',
    payment_method: 'cash',
    card_details: ''
  })

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }

    fetchUserData()
    fetchCart()
  }, [isLoggedIn])

  const fetchUserData = async () => {
    try {
      const response = await axiosInstance.get('/orders/user-data/')
      setUserData(response.data)
      setOrderData(prev => ({
        ...prev,
        contact_email: response.data.contact_email || '',
        contact_phone: response.data.contact_phone || '',
        contact_name: response.data.contact_name || ''
      }))
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const fetchCart = async () => {
    try {
      const response = await axiosInstance.get('/cart/')
      setCart(response.data)
      
      // Якщо кошик порожній, перенаправляємо на кошик
      if (!response.data.items || response.data.items.length === 0) {
        alert('Кошик порожній')
        navigate('/cart')
        return
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
      navigate('/cart')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setOrderData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Тільки замовлення з кошика
      const response = await axiosInstance.post('/orders/create/', orderData)

      // Оновлюємо кошик в хедері
      window.dispatchEvent(new CustomEvent('cartUpdated'))

      // Переходимо на сторінку успіху
      navigate('/order-success', {
        state: { 
          order: response.data.order,
          message: response.data.message 
        }
      })
    } catch (error) {
      console.error('Error creating order:', error)
      if (error.response?.data) {
        const errors = error.response.data
        let errorMessage = 'Помилка при оформленні замовлення:\n'
        Object.keys(errors).forEach(key => {
          if (Array.isArray(errors[key])) {
            errorMessage += `${key}: ${errors[key].join(', ')}\n`
          } else {
            errorMessage += `${key}: ${errors[key]}\n`
          }
        })
        alert(errorMessage)
      } else {
        alert('Помилка при оформленні замовлення')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!cart) {
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
      <div className="row">
        <div className="col-12">
          <h2>📋 Оформлення замовлення</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row mt-4">
          <div className="col-lg-8">
            {/* Contact Information */}
            <div className="card mb-4">
              <div className="card-header">
                <h5>📞 Контактна інформація</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Ім'я</label>
                    <input
                      type="text"
                      className="form-control"
                      name="contact_name"
                      value={orderData.contact_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="contact_email"
                      value={orderData.contact_email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label">Телефон</label>
                    <div className="input-group">
                      <span className="input-group-text">+380</span>
                      <input
                        type="text"
                        className="form-control"
                        name="contact_phone"
                        value={orderData.contact_phone}
                        onChange={handleInputChange}
                        placeholder="501234567"
                        maxLength="9"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="card mb-4">
              <div className="card-header">
                <h5>🚚 Доставка</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Адреса доставки</label>
                  <textarea
                    className="form-control"
                    name="delivery_address"
                    value={orderData.delivery_address}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Вкажіть повну адресу доставки"
                    required
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card">
              <div className="card-header">
                <h5>💳 Спосіб оплати</h5>
              </div>
              <div className="card-body">
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="payment_method"
                    value="cash"
                    checked={orderData.payment_method === 'cash'}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label">
                    <i className="fas fa-money-bill-wave"></i> Наложений платіж
                  </label>
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="payment_method"
                    value="card"
                    checked={orderData.payment_method === 'card'}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label">
                    <i className="fas fa-credit-card"></i> Оплата картою
                  </label>
                </div>

                {orderData.payment_method === 'card' && (
                  <div className="mt-3">
                    <label className="form-label">Деталі картки</label>
                    <input
                      type="text"
                      className="form-control"
                      name="card_details"
                      value={orderData.card_details}
                      onChange={handleInputChange}
                      placeholder="Останні 4 цифри картки"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            {/* Order Summary */}
            <div className="card">
              <div className="card-header">
                <h5>📄 Ваше замовлення ({cart.total_items} товарів)</h5>
              </div>
              <div className="card-body">
                {/* Product List */}
                <div className="mb-3">
                  <h6 className="mb-3">Товари для замовлення:</h6>
                  <div className="order-items-list">
                    {cart.items.map((item, index) => (
                      <div key={item.id} className="order-item-card p-3 mb-3 border rounded">
                        <div className="row align-items-center">
                          <div className="col-3">
                            {item.book_data.image ? (
                              <img
                                src={item.book_data.image}
                                className="img-fluid rounded"
                                style={{ width: '60px', height: '80px', objectFit: 'cover' }}
                                alt={item.book_data.title}
                              />
                            ) : (
                              <div className="bg-light rounded d-flex align-items-center justify-content-center" 
                                   style={{ width: '60px', height: '80px' }}>
                                <i className="fas fa-book fa-2x text-muted"></i>
                              </div>
                            )}
                          </div>
                          <div className="col-9">
                            <h6 className="mb-1 text-truncate" title={item.book_data.title}>
                              {item.book_data.title}
                            </h6>
                            <p className="text-muted small mb-1">
                              {item.book_data.author?.map(a => a.name).join(', ')}
                            </p>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="text-success fw-bold small">
                                <i className="fas fa-hryvnia-sign"></i> {item.book_data.price} грн
                              </span>
                              <span className="badge bg-primary small">
                                × {item.quantity}
                              </span>
                            </div>
                            <div className="mt-1">
                              <strong className="text-success">
                                Всього: <i className="fas fa-hryvnia-sign"></i> {item.total_price} грн
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <hr />
                <div className="order-summary-section">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Загальна кількість:</span>
                    <span className="fw-bold">{cart.total_items}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Доставка:</span>
                    <span className="text-success">Безкоштовно</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between mb-3">
                    <span className="fw-bold fs-5">ЗАГАЛОМ:</span>
                    <span className="fw-bold text-success fs-5">
                      <i className="fas fa-hryvnia-sign"></i> {cart.total_price} грн
                    </span>
                  </div>
                </div>

                <div className="d-grid">
                  <button
                    type="submit"
                    className="btn btn-success btn-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Оформлення...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i> Підтвердити замовлення
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default Checkout