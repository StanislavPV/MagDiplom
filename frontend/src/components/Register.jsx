import React, { useState, useContext } from 'react'
import axios from 'axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [errors, setErrors] = useState({});
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { setIsLoggedIn } = useContext(AuthContext);

    const handleRegistration = async (e) => {
        e.preventDefault();
        setLoading(true);
        const userData = {
            name: username,
            email,
            password,
            password_confirm: passwordConfirm,
            phone_number: phone,
        }

        try {
            const response = await axios.post('http://0.0.0.0:8000/api/register/', userData);
            setErrors({});
            setSuccess(true);

            // Автоматичний логін після реєстрації
            const loginData = { email, password };
            const loginResponse = await axios.post('http://0.0.0.0:8000/api/login/', loginData);
            localStorage.setItem('accessToken', loginResponse.data.access);
            localStorage.setItem('refreshToken', loginResponse.data.refresh);
            setIsLoggedIn(true);

        } catch (error) {
            setErrors(error.response?.data || {});
            console.error('Error during registration:', error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='auth-page'>
            <div className='container'>
                <div className='row justify-content-center'>
                    <div className='col-lg-6 col-md-8'>
                        <div className='auth-container'>
                            <div className='auth-form'>
                                <div className='text-center mb-4'>
                                    <h3 className='fw-bold text-primary'>📚 Створити акаунт</h3>
                                    <p className='text-muted'>Приєднуйтесь до нашої спільноти книголюбів</p>
                                </div>
                                
                                <form onSubmit={handleRegistration}>
                                    <div className='row'>
                                        <div className='col-md-6 mb-3'>
                                            <label className='form-label fw-semibold'>Ім'я</label>
                                            <input 
                                                type='text' 
                                                className='form-control' 
                                                placeholder="Ваше ім\'я" 
                                                value={username} 
                                                onChange={(e) => setUsername(e.target.value)}
                                                required
                                            />
                                            {errors.name && <div className='text-danger small mt-1'>{errors.name}</div>}
                                        </div>
                                        
                                        <div className='col-md-6 mb-3'>
                                            <label className='form-label fw-semibold'>Електронна пошта</label>
                                            <input 
                                                type='email' 
                                                className='form-control' 
                                                placeholder='example@email.com' 
                                                value={email} 
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                            {errors.email && <div className='text-danger small mt-1'>{errors.email}</div>}
                                        </div>
                                    </div>
                                    
                                    <div className='row'>
                                        <div className='col-md-6 mb-3'>
                                            <label className='form-label fw-semibold'>Пароль</label>
                                            <input 
                                                type='password' 
                                                className='form-control' 
                                                placeholder='Створіть пароль' 
                                                value={password} 
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                            {errors.password && <div className='text-danger small mt-1'>{errors.password}</div>}
                                        </div>
                                        
                                        <div className='col-md-6 mb-3'>
                                            <label className='form-label fw-semibold'>Підтвердіть пароль</label>
                                            <input 
                                                type='password' 
                                                className='form-control' 
                                                placeholder='Повторіть пароль' 
                                                value={passwordConfirm} 
                                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                                required
                                            />
                                            {errors.password_confirm && <div className='text-danger small mt-1'>{errors.password_confirm}</div>}
                                            {errors.non_field_errors && errors.non_field_errors.map((err, idx) => 
                                                <div key={idx} className='text-danger small mt-1'>{err}</div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className='mb-4'>
                                        <label className='form-label fw-semibold'>Номер телефону</label>
                                        <div className="input-group">
                                            <span className="input-group-text">+380</span>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                placeholder="501234567" 
                                                value={phone} 
                                                onChange={(e) => setPhone(e.target.value)}
                                                maxLength="9"
                                                required
                                            />
                                        </div>
                                        {errors.phone_number && <div className='text-danger small mt-1'>{errors.phone_number}</div>}
                                    </div>
                                    
                                    {success && (
                                        <div className='alert alert-success'>
                                            <i className='fas fa-check-circle me-2'></i>
                                            Реєстрація успішна! Перенаправляємо...
                                        </div>
                                    )}
                                    
                                    <div className='d-grid'>
                                        {loading ? (
                                            <button type='submit' className='btn btn-primary btn-lg' disabled>
                                                <FontAwesomeIcon icon={faSpinner} spin className='me-2' />
                                                Створюємо акаунт...
                                            </button>
                                        ) : (
                                            <button type='submit' className='btn btn-primary btn-lg'>
                                                <i className='fas fa-user-plus me-2'></i>
                                                Зареєструватися
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

export default Register