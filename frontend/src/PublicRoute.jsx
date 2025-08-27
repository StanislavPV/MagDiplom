import {useContext} from 'react'
import { AuthContext } from './AuthProvider'
import { Navigate } from 'react-router-dom'

// Компонент для публічних маршрутів (доступні тільки неавторизованим користувачам)
const PublicRoute = ({children}) => {
    const { isLoggedIn } = useContext(AuthContext)
  return !isLoggedIn ? (
    children
  ) : (
    <Navigate to='/' />
  )
}

export default PublicRoute