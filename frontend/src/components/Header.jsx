import React from 'react'
import Button from './Button'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'
import { useContext } from 'react'

const Header = () => {
  const { isLoggedIn, setIsLoggedIn } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsLoggedIn(false);
    navigate('/');
  };
  return (
    <>
      <nav className='navbar container pt-3 pb-3 align-items-start'>
        <Link className='navbar-brand' to='/'>BookStore</Link>

        <div>
          {isLoggedIn ? (
            <button className='btn btn-danger' onClick={handleLogout}>Вийти</button>
          ) : (
            <>
              <Button text='Логін' class='btn-outline-info' url="/login" />
              &nbsp;
              <Button text='Реєстрація' class='btn-info' url="/register" />
            </>
          )}
        </div>
      </nav>
    </>
  )
}

export default Header