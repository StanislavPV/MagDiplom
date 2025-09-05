import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import axios from 'axios'
import { Link } from 'react-router-dom'

const PasswordReset = () => {
    const [email, setEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        if (newPassword !== confirmPassword) {
            setError('Паролі не співпадають')
            setLoading(false)
            return
        }

        try {
            const response = await axios.post('http://0.0.0.0:8000/api/reset-password/', {
                email,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
            
            setMessage(response.data.message)
            setSuccess(true)
            
            // Через 3 секунди перенаправляємо на сторінку входу
            setTimeout(() => {
                window.location.href = '/login'
            }, 3000)
            
        } catch (error) {
            if (error.response?.data?.errors) {
                const errors = error.response.data.errors
                if (errors.email) {
                    setError(errors.email[0])
                } else if (errors.new_password) {
                    setError(errors.new_password[0])
                } else if (errors.non_field_errors) {
                    setError(errors.non_field_errors[0])
                } else {
                    setError('Помилка при зміні паролю')
                }
            } else {
                setError('Помилка при зміні паролю')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='auth-page'>
            <div className='container'>
                <div className='row justify-content-center'>
                    <div className='col-lg-5 col-md-7'>
                        <div className='auth-container'>
                            <div className='auth-form'>
                                <div className='text-center mb-4'>
                                    <h3 className='fw-bold text-primary'>Скидання паролю</h3>
                                    <p className='text-muted'>Введіть ваш email та новий пароль</p>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className='mb-3'>
                                        <label className='form-label fw-semibold'>Електронна пошта</label>
                                        <input 
                                            type='email' 
                                            className='form-control' 
                                            placeholder='example@email.com' 
                                            value={email} 
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={success}
                                        />
                                    </div>
                                    
                                    <div className='mb-3'>
                                        <label className='form-label fw-semibold'>Новий пароль</label>
                                        <input 
                                            type='password' 
                                            className='form-control' 
                                            placeholder='Введіть новий пароль' 
                                            value={newPassword} 
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            minLength={8}
                                            disabled={success}
                                        />
                                    </div>
                                    
                                    <div className='mb-4'>
                                        <label className='form-label fw-semibold'>Підтвердження паролю</label>
                                        <input 
                                            type='password' 
                                            className='form-control' 
                                            placeholder='Підтвердіть новий пароль' 
                                            value={confirmPassword} 
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            minLength={8}
                                            disabled={success}
                                        />
                                    </div>
                                    
                                    {message && (
                                        <div className='alert alert-success'>
                                            <i className='fas fa-check-circle me-2'></i>
                                            {message}
                                            <div className='mt-2'>
                                                <small>Перенаправляємо на сторінку входу...</small>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {error && (
                                        <div className='alert alert-danger'>
                                            <i className='fas fa-exclamation-triangle me-2'></i>
                                            {error}
                                        </div>
                                    )}
                                    
                                    <div className='d-grid mb-3'>
                                        {loading ? (
                                            <button type='submit' className='btn btn-primary btn-lg' disabled>
                                                <FontAwesomeIcon icon={faSpinner} spin className='me-2' />
                                                Змінюємо пароль...
                                            </button>
                                        ) : (
                                            <button type='submit' className='btn btn-primary btn-lg' disabled={success}>
                                                <i className='fas fa-save me-2'></i>
                                                Змінити пароль
                                            </button>
                                        )}
                                    </div>
                                </form>

                                <div className='text-center mt-4'>
                                    <Link to='/login' className='text-decoration-none'>
                                        <i className='fas fa-arrow-left me-2'></i>
                                        Повернутися до входу
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PasswordReset