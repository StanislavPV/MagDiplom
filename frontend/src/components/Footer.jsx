import React from 'react'

// Компонент футера з контактною інформацією та соціальними мережами
function Footer() {
  return (
    <footer className='footer bg-dark text-light py-4 mt-5'>
      <div className='container'>
        <div className='row'>
          {/* Контактна інформація */}
          <div className='col-md-4 mb-3'>
            <h5 className='mb-3'>📚 BookStore</h5>
            <p className='text-muted'>Найкращий книжковий магазин для всіх любителів читання</p>
            <div className='contact-info'>
              <p className='mb-2'>
                <i className='fas fa-map-marker-alt me-2'></i>
                вул. Книжкова, 123, Київ
              </p>
              <p className='mb-2'>
                <i className='fas fa-phone me-2'></i>
                +380 (44) 123-45-67
              </p>
              <p className='mb-0'>
                <i className='fas fa-envelope me-2'></i>
                info@bookstore.ua
              </p>
            </div>
          </div>

          {/* Години роботи */}
          <div className='col-md-4 mb-3'>
            <h5 className='mb-3'>🕐 Години роботи</h5>
            <div className='working-hours'>
              <p className='mb-1'>
                <i className='fas fa-clock me-2'></i>
                Пн-Пт: 09:00 - 20:00
              </p>
              <p className='mb-1'>
                <i className='fas fa-clock me-2'></i>
                Сб: 10:00 - 18:00
              </p>
              <p className='mb-1'>
                <i className='fas fa-clock me-2'></i>
                Нд: 11:00 - 17:00
              </p>
              <p className='mb-0 text-warning'>
                <i className='fas fa-info-circle me-2'></i>
                Доставка щодня
              </p>
            </div>
          </div>

          {/* Соціальні мережі */}
          <div className='col-md-4 mb-3'>
            <h5 className='mb-3'>📱 Ми в соціальних мережах</h5>
            <div className='social-links'>
              <div className='d-flex flex-wrap gap-3'>
                <div className='social-item'>
                  <i className='fab fa-instagram fa-2x text-danger'></i>
                  <span className='ms-2'>@bookstore_ua</span>
                </div>
                <div className='social-item'>
                  <i className='fab fa-facebook fa-2x text-primary'></i>
                  <span className='ms-2'>BookStore Ukraine</span>
                </div>
                <div className='social-item'>
                  <i className='fab fa-telegram fa-2x text-info'></i>
                  <span className='ms-2'>@bookstore_chat</span>
                </div>
                <div className='social-item'>
                  <i className='fab fa-viber fa-2x text-purple'></i>
                  <span className='ms-2'>+380 (44) 123-45-67</span>
                </div>
              </div>
             
            </div>
          </div>
        </div>

        <hr className='my-4' />
        
        {/* Авторські права */}
        <div className='row'>
          <div className='col-12 text-center'>
            <p className='mb-0'>&copy; 2025 BookStore. Всі права захищені ❤️</p>
            <small className='text-muted'>
              Створено з любов'ю до книг
            </small>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer