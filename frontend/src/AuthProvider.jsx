import {useState, useContext, createContext} from 'react'


const AuthContext = createContext();

// Провайдер контексту для управління станом авторизації
const AuthProvider = ({children}) => {
    const [isLoggedIn, setIsLoggedIn] = useState(
        !!localStorage.getItem('accessToken') 
    )
  return (
    <AuthContext.Provider value={{isLoggedIn, setIsLoggedIn}}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
export { AuthContext };