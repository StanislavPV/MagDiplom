import React, { useContext, useState, useEffect } from 'react'
import Button from './Button'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../AuthProvider'
import axiosInstance from '../axiosInstance'

const Header = () => {
  const { isLoggedIn, setIsLoggedIn } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [genres, setGenres] = useState([]);
  const [cartSummary, setCartSummary] = useState({ total_items: 0, total_price: 0 });

  useEffect(() => {
    fetchGenres();
    // Set current search values from URL
    const searchParams = new URLSearchParams(location.search);
    setSearchTerm(searchParams.get('search') || '');
    setSelectedGenre(searchParams.get('genres') || '');
    
    // Fetch cart summary if logged in
    if (isLoggedIn) {
      fetchCartSummary();
    }

    // Listen for cart updates
    const handleCartUpdate = () => {
      if (isLoggedIn) {
        fetchCartSummary();
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [location.search, isLoggedIn]);

  const fetchGenres = async () => {
    try {
      const response = await axiosInstance.get('/genres/');
      setGenres(response.data);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const fetchCartSummary = async () => {
    try {
      const response = await axiosInstance.get('/cart/summary/');
      setCartSummary(response.data);
    } catch (error) {
      console.error('Error fetching cart summary:', error);
      setCartSummary({ total_items: 0, total_price: 0 });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsLoggedIn(false);
    setCartSummary({ total_items: 0, total_price: 0 });
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    if (selectedGenre) params.append('genres', selectedGenre);
    
    const queryString = params.toString();
    navigate(`/${queryString ? `?${queryString}` : ''}`);
  };

  const handleGenreChange = (e) => {
    const genre = e.target.value;
    setSelectedGenre(genre);
    
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    if (genre) params.append('genres', genre);
    
    const queryString = params.toString();
    navigate(`/${queryString ? `?${queryString}` : ''}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGenre('');
    navigate('/');
  };

  return (
    <nav className='navbar navbar-expand-lg navbar-light bg-light shadow-sm'>
      <div className='container'>
        <Link className='navbar-brand fw-bold fs-3 text-decoration-none' to='/'>
          📚 BookStore
        </Link>

        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Search and Filter in Header */}
          <div className="d-flex align-items-center me-auto ms-3">
            <form onSubmit={handleSearch} className="d-flex">
              <select
                className="form-select me-2"
                value={selectedGenre}
                onChange={handleGenreChange}
                style={{ minWidth: '130px' }}
              >
                <option value="">Всі жанри</option>
                {genres.map(genre => (
                  <option key={genre.id} value={genre.id}>{genre.name}</option>
                ))}
              </select>
              
              <input
                type="text"
                className="form-control me-2"
                placeholder="Пошук книг..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ minWidth: '200px' }}
              />
              
              <button className="btn btn-outline-primary me-1" type="submit">
                <i className="fas fa-search"></i>
              </button>
              
              {(searchTerm || selectedGenre) && (
                <button 
                  type="button" 
                  onClick={clearFilters}
                  className="btn btn-outline-secondary"
                  title="Очистити фільтри"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </form>
          </div>

          <div className="d-flex align-items-center">
            {isLoggedIn ? (
              <>
                {/* Cart Icon */}
                <Link to="/cart" className="btn btn-outline-success me-2 position-relative">
                  <i className="fas fa-shopping-cart"></i>
                  {cartSummary.total_items > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {cartSummary.total_items}
                    </span>
                  )}
                </Link>
                
                <Link to="/profile" className="btn btn-outline-primary me-2">
                  <i className="fas fa-user"></i> Профіль
                </Link>
                <button className='btn btn-danger' onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt"></i> Вийти
                </button>
              </>
            ) : (
              <>
                <Button text='Логін' class='btn-outline-info me-2' url="/login" />
                <Button text='Реєстрація' class='btn-info' url="/register" />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Header