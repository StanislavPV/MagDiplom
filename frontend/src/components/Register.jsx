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
        <>
            <div className='container'>
                <div className='row justify-content-center'>
                    <div className='col-md-6 bg-light p-5 rounded'>
                        <h3 className='text-center'>Створити акаунт</h3>
                        <form onSubmit={handleRegistration}>
                            <div className='mb-3'>
                                <input type='text' className='form-control mb-3' placeholder='Ім’я' value={username} onChange={(e) => setUsername(e.target.value)} />
                                <small>{errors.name && <div className='text-danger'>{errors.name}</div>}</small>
                            </div>
                            <div className='mb-3'>
                                <input type='email' className='form-control mb-3' placeholder='Електронна пошта' value={email} onChange={(e) => setEmail(e.target.value)} />
                                <small>{errors.email && <div className='text-danger'>{errors.email}</div>}</small>
                            </div>
                            <div className='mb-3'>
                                <input type='password' className='form-control mb-3' placeholder='Пароль' value={password} onChange={(e) => setPassword(e.target.value)} />
                                <small>{errors.password && <div className='text-danger'>{errors.password}</div>}</small>
                            </div>
                            <div className='mb-3'>
                                <input type='password' className='form-control mb-3' placeholder='Підтвердіть пароль' value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
                                <small>{errors.password_confirm && <div className='text-danger'>{errors.password_confirm}</div>} {errors.non_field_errors && errors.non_field_errors.map((err, idx) => <div key={idx} className='text-danger'>{err}</div>)}</small>
                            </div>
                            <div className="input-group mb-3">
                                <span className="input-group-text">380</span>
                                <input type="text" className="form-control" placeholder="Номер телефону" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                <small>{errors.phone_number && <div className='text-danger'>{errors.phone_number}</div>}</small>
                            </div>
                            {success && <div className='alert alert-success'>Реєстрація успішна!</div>}
                            {loading ? (
                                <button type='submit' className='btn btn-primary mt-3 w-100' disabled>
                                    <FontAwesomeIcon icon={faSpinner} spin /> Зачекайте...
                                </button>
                            ) : (
                                <button type='submit' className='btn btn-primary mt-3 w-100'>Зареєструватися</button>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Register