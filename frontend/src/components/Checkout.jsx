import React, { useState, useEffect, useContext } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'
import axiosInstance from '../axiosInstance'

const Checkout = () => {
  const { isLoggedIn } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState({})
  const [cart, setCart] = useState(null)
  const [singleBook, setSingleBook] = useState(null)
  const [orderData, setOrderData] = useState({
    contact_email: '',
    contact_phone: '',
    contact_name: '',
    delivery_address: '',
    payment_method: 'cash',
    card_details: ''
  })

  // Check if this is a single book purchase
  const bookId = new URLSearchParams(location.search).get('book')

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }

    fetchUserData()
    
    // Always fetch cart to check for existing items
    fetchCart()
    
    if (bookId) {
      fetchSingleBook(bookId)
    }
  }, [isLoggedIn, bookId])

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
      
      // If no single book and cart is empty, redirect to cart
      if (!bookId && (!response.data.items || response.data.items.length === 0)) {
        alert('Кошик порожній')
        navigate('/cart')
        return
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
    }
  }

  const fetchSingleBook = async (id) => {
    try {
      const response = await axiosInstance.get(`/books/${id}/`)
      setSingleBook({ ...response.data, quantity: 1 })
    } catch (error) {
      console.error('Error fetching book:', error)
      navigate('/')
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
      let response
      if (singleBook) {
        // Single book order
        response = await axiosInstance.post('/orders/create-single/', {
          ...orderData,
          book_id: singleBook.id,
          quantity: singleBook.quantity
        })
      } else {
        // Cart order
        response = await axiosInstance.post('/orders/create/', orderData)
      }

      // Update cart count in header
      window.dispatchEvent(new CustomEvent('cartUpdated'))

      // Redirect to success page with order data
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

  // Calculate totals and merge duplicate books
  const getAllItems = () => {
    const items = []
    const bookMap = new Map()

    // Add cart items
    if (cart?.items) {
      cart.items.forEach(item => {
        bookMap.set(item.book, {
          ...item,
          source: 'cart'
        })
      })
    }

    // Add or merge single book
    if (singleBook) {
      const existingItem = bookMap.get(singleBook.id)
      if (existingItem) {
        // Merge quantities
        bookMap.set(singleBook.id, {
          ...existingItem,
          quantity: existingItem.quantity + singleBook.quantity,
          source: 'both'
        })
      } else {
        // Add as new item
        bookMap.set(singleBook.id, {
          id: `single-${singleBook.id}`,
          book: singleBook.id,
          book_data: singleBook,
          quantity: singleBook.quantity,
          total_price: (singleBook.price || 0) * singleBook.quantity,
          source: 'single'
        })
      }
    }

    return Array.from(bookMap.values())
  }

  const allItems = getAllItems()
  const totalAmount = allItems.reduce((sum, item) => sum + (item.total_price || 0), 0)
  const totalItems = allItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h2>📋 Оформлення замовлення</h2>
          {singleBook && cart && cart.items.length > 0 && (
            <div className="alert alert-info">
              <i className="fas fa-info-circle"></i> У вашому кошику є товари, 
              вони також будуть додані до цього замовлення.
              {allItems.some(item => item.source === 'both') && (
                <span className="ms-2">
                  <strong>Примітка:</strong> Однакові книги об'єднано в одну позицію.
                </span>
              )}
            </div>
          )}
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
            {/* Order Summary with Product Carousel */}
            <div className="card">
              <div className="card-header">
                <h5>📄 Ваше замовлення ({totalItems} товарів)</h5>
              </div>
              <div className="card-body">
                {/* Product Carousel */}
                {allItems.length > 0 && (
                  <div className="mb-3">
                    <div id="orderCarousel" className="carousel slide" data-bs-ride="carousel">
                      <div className="carousel-indicators">
                        {allItems.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            data-bs-target="#orderCarousel"
                            data-bs-slide-to={index}
                            className={index === 0 ? 'active' : ''}
                          ></button>
                        ))}
                      </div>
                      
                      <div className="carousel-inner">
                        {allItems.map((item, index) => (
                          <div key={item.book} className={`carousel-item ${index === 0 ? 'active' : ''}`}>
                            <div className="d-flex align-items-center p-2">
                              <div className="me-3" style={{ minWidth: '80px' }}>
                                {item.book_data.image ? (
                                  <img
                                    src={item.book_data.image}
                                    className="img-fluid rounded"
                                    style={{ width: '80px', height: '100px', objectFit: 'cover' }}
                                    alt={item.book_data.title}
                                  />
                                ) : (
                                  <div className="bg-light rounded d-flex align-items-center justify-content-center" 
                                       style={{ width: '80px', height: '100px' }}>
                                    <i className="fas fa-book fa-2x text-muted"></i>
                                  </div>
                                )}
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="mb-1 text-truncate" title={item.book_data.title}>
                                  {item.book_data.title}
                                </h6>
                                <p className="text-muted small mb-1">
                                  {item.book_data.author?.map(a => a.name).join(', ')}
                                </p>
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="text-success fw-bold">
                                    <i className="fas fa-hryvnia-sign"></i> {item.book_data.price} грн
                                  </span>
                                  <span className="badge bg-primary">
                                    Кількість: {item.quantity}
                                  </span>
                                </div>
                                {item.source === 'both' && (
                                  <small className="text-info">
                                    <i className="fas fa-info-circle"></i> Об'єднано з кошиком
                                  </small>
                                )}
                                {item.source === 'single' && (
                                  <small className="text-primary">
                                    <i className="fas fa-bolt"></i> Швидка покупка
                                  </small>
                                )}
                                {item.source === 'cart' && (
                                  <small className="text-secondary">
                                    <i className="fas fa-shopping-cart"></i> З кошика
                                  </small>
                                )}
                                <div className="mt-1">
                                  <strong>
                                    Всього: <i className="fas fa-hryvnia-sign"></i> {item.total_price} грн
                                  </strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {allItems.length > 1 && (
                        <>
                          <button className="carousel-control-prev" type="button" data-bs-target="#orderCarousel" data-bs-slide="prev">
                            <span className="carousel-control-prev-icon bg-dark rounded-circle"></span>
                          </button>
                          <button className="carousel-control-next" type="button" data-bs-target="#orderCarousel" data-bs-slide="next">
                            <span className="carousel-control-next-icon bg-dark rounded-circle"></span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Summary */}
                <hr />
                <div className="d-flex justify-content-between mb-2">
                  <span>Загальна кількість:</span>
                  <span>{totalItems}</span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="fw-bold fs-5">ЗАГАЛОМ:</span>
                  <span className="fw-bold text-success fs-5">
                    <i className="fas fa-hryvnia-sign"></i> {totalAmount} грн
                  </span>
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