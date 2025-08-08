import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'
import { useContext } from 'react'

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { isLoggedIn, setIsLoggedIn } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const userData = { email, password };

    try {
      const response = await axios.post('http://0.0.0.0:8000/api/login/', userData);
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      console.log('Login successful');
      setIsLoggedIn(true);
 
    } catch (error) {
      console.error('Невірні дані:', error.response.data);
      setError('Невірні дані для входу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-page'>
      <div className='container'>
        <div className='row justify-content-center'>
          <div className='col-lg-5 col-md-7'>
            <div className='auth-container'>
              <div className='auth-form'>
                <div className='text-center mb-4'>
                  <h3 className='fw-bold text-primary'>📚 Вхід в систему</h3>
                  <p className='text-muted'>Увійдіть до свого акаунту</p>
                </div>
                
                <form onSubmit={handleLogin}>
                  <div className='mb-3'>
                    <label className='form-label fw-semibold'>Електронна пошта</label>
                    <input 
                      type='email' 
                      className='form-control' 
                      placeholder='example@email.com' 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className='mb-4'>
                    <label className='form-label fw-semibold'>Пароль</label>
                    <input 
                      type='password' 
                      className='form-control' 
                      placeholder='Введіть пароль' 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  {error && (
                    <div className='alert alert-danger'>
                      <i className='fas fa-exclamation-triangle me-2'></i>
                      {error}
                    </div>
                  )}
                  
                  <div className='d-grid'>
                    {loading ? (
                      <button type='submit' className='btn btn-primary btn-lg' disabled>
                        <FontAwesomeIcon icon={faSpinner} spin className='me-2' />
                        Зачекайте...
                      </button>
                    ) : (
                      <button type='submit' className='btn btn-primary btn-lg'>
                        <i className='fas fa-sign-in-alt me-2'></i>
                        Увійти
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login