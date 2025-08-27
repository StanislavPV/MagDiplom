import {useContext} from 'react'
import { AuthContext } from './AuthProvider'
import { Navigate } from 'react-router-dom'

// Компонент для приватних маршрутів (доступні тільки авторизованим користувачам)
const PrivateRoute = ({children}) => {
    const { isLoggedIn } = useContext(AuthContext)
  return isLoggedIn ? (
    children
  ) : (
    <Navigate to='/login' />
  )
}

export default PrivateRoute