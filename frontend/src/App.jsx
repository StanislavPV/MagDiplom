import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Main from './components/Main'
import Header from './components/Header'
import Footer from './components/Footer'
import Register from './components/Register'
import Login from './components/Login'
import BookDetail from './components/BookDetail'
import Profile from './components/Profile'
import Cart from './components/Cart'
import Checkout from './components/Checkout'
import OrderSuccess from './components/OrderSuccess'
import AuthProvider from './AuthProvider'
import PrivateRoute from './PrivateRoute'
import PublicRoute from './PublicRoute'
import OrderDetail from './components/OrderDetail'
import './assets/css/style.css'

// Головний компонент додатку з налаштуванням маршрутизації
function App() {
  return (
    <>
      <AuthProvider>
        <BrowserRouter>
          <Header />
          <div className="page-wrapper">
            <Routes>
              <Route path='/' element={<Main />} />
              <Route path='/books/:id' element={<BookDetail />} />
              <Route path='/profile' element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path='/cart' element={<PrivateRoute><Cart /></PrivateRoute>} />
              <Route path='/checkout' element={<PrivateRoute><Checkout /></PrivateRoute>} />
              <Route path='/order-success' element={<PrivateRoute><OrderSuccess /></PrivateRoute>} />
              <Route path='/register' element={<PublicRoute><Register /></PublicRoute>} />
              <Route path='/login' element={<PublicRoute><Login /></PublicRoute>} />
              <Route path='/orders/:id'  element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
            </Routes>
          </div>
          <Footer />
        </BrowserRouter>
      </AuthProvider>
    </>
  )
}

export default App