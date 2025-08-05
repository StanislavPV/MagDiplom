import { useState } from 'react'
import './assets/css/style.css'
import Header from './components/Header'
import Main from './components/Main'
import Footer from './components/Footer'
import Register from './components/Register'
import Login from './components/Login'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AuthProvider from './AuthProvider'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <AuthProvider>
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path='/' element={<Main />} />
            <Route path='/register' element={<Register />} />
            <Route path='/login' element={<Login />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </AuthProvider>
    </>
  )
}

export default App
