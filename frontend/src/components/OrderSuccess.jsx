import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

const OrderSuccess = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [orderData, setOrderData] = useState(null)

  useEffect(() => {
    // Get order data from navigation state
    if (location.state?.order) {
      setOrderData(location.state.order)
    } else {
      // Redirect if no order data
      navigate('/')
    }
  }, [location.state, navigate])

  if (!orderData) {
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
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-body text-center py-5">
              {/* Success Icon */}
              <div className="mb-4">
                <i className="fas fa-check-circle fa-5x text-success"></i>
              </div>

              {/* Success Message */}
              <h2 className="text-success mb-3">Замовлення успішно оформлено!</h2>
              <p className="lead mb-4">
                Дякуємо за ваше замовлення! Ми зв'яжемося з вами найближчим часом.
              </p>

              {/* Order Details */}
              <div className="row">
                <div className="col-md-6 offset-md-3">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h5 className="card-title">📋 Деталі замовлення</h5>
                      <div className="text-start">
                        <p className="mb-2">
                          <strong>Номер замовлення:</strong> {orderData.order_number}
                        </p>
                        <p className="mb-2">
                          <strong>Загальна сума:</strong> 
                          <span className="text-success ms-2">
                            <i className="fas fa-hryvnia-sign"></i> {orderData.total_amount} грн
                          </span>
                        </p>
                        <p className="mb-2">
                          <strong>Кількість товарів:</strong> {orderData.total_items}
                        </p>
                        <p className="mb-2">
                          <strong>Спосіб оплати:</strong> {orderData.payment_method_display}
                        </p>
                        <p className="mb-0">
                          <strong>Дата замовлення:</strong> {new Date(orderData.created_at).toLocaleDateString('uk-UA')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="mt-4">
                <h6>Що далі?</h6>
                <p className="text-muted mb-4">
                  Ми обробимо ваше замовлення та зв'яжемося з вами протягом 24 годин 
                  для підтвердження деталей доставки.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                <Link to="/profile?tab=orders" className="btn btn-primary me-md-2">
                  <i className="fas fa-list"></i> Мої замовлення
                </Link>
                <Link to="/" className="btn btn-outline-primary">
                  <i className="fas fa-home"></i> На головну
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderSuccess