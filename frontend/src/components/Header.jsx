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
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [selectedRatingOrder, setSelectedRatingOrder] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [genres, setGenres] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [cartSummary, setCartSummary] = useState({ total_items: 0, total_price: 0 });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    fetchGenres();
    fetchAuthors();
    // Set current search values from URL
    const searchParams = new URLSearchParams(location.search);
    setSearchTerm(searchParams.get('search') || '');
    setSelectedGenre(searchParams.get('genres') || '');
    setSelectedAuthor(searchParams.get('author') || '');
    setSelectedRatingOrder(searchParams.get('rating_order') || '');
    setPriceRange({
      min: searchParams.get('min_price') || '',
      max: searchParams.get('max_price') || ''
    });
    
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

  const fetchAuthors = async () => {
    try {
      const response = await axiosInstance.get('/authors/');
      setAuthors(response.data);
    } catch (error) {
      console.error('Error fetching authors:', error);
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
    applyFilters();
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    if (selectedGenre) params.append('genres', selectedGenre);
    if (selectedAuthor) params.append('author', selectedAuthor);
    if (selectedRatingOrder) params.append('rating_order', selectedRatingOrder);
    if (priceRange.min) params.append('min_price', priceRange.min);
    if (priceRange.max) params.append('max_price', priceRange.max);
    
    const queryString = params.toString();
    navigate(`/${queryString ? `?${queryString}` : ''}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGenre('');
    setSelectedAuthor('');
    setSelectedRatingOrder('');
    setPriceRange({ min: '', max: '' });
    navigate('/');
  };

  const hasActiveFilters = searchTerm || selectedGenre || selectedAuthor || selectedRatingOrder || priceRange.min || priceRange.max;

  return (
    <>
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
            {/* Search Form */}
            <form onSubmit={handleSearch} className="d-flex align-items-center flex-grow-1 mx-3">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Пошук книг..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="btn btn-outline-primary" type="submit">
                  <i className="fas fa-search"></i>
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`btn ${hasActiveFilters ? 'btn-primary' : 'btn-outline-secondary'}`}
                  title="Розширені фільтри"
                >
                  <i className="fas fa-filter"></i>
                </button>
                {hasActiveFilters && (
                  <button 
                    type="button" 
                    onClick={clearFilters}
                    className="btn btn-outline-danger"
                    title="Очистити фільтри"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </form>

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

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-light border-bottom py-3">
          <div className="container">
            <div className="row g-3">
              <div className="col-md-2">
                <label className="form-label small fw-semibold">Жанр:</label>
                <select
                  className="form-select form-select-sm filter-select"
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                >
                  <option value="">Всі жанри</option>
                  {genres.map(genre => (
                    <option key={genre.id} value={genre.id}>{genre.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-2">
                <label className="form-label small fw-semibold">Автор:</label>
                <select
                  className="form-select form-select-sm filter-select"
                  value={selectedAuthor}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                >
                  <option value="">Всі автори</option>
                  {authors.map(author => (
                    <option key={author.id} value={author.id}>{author.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label small fw-semibold">За рейтингом:</label>
                <select
                  className="form-select form-select-sm filter-select"
                  value={selectedRatingOrder}
                  onChange={(e) => setSelectedRatingOrder(e.target.value)}
                >
                  <option value="">Без сортування</option>
                  <option value="desc">Від вищого до нижчого</option>
                  <option value="asc">Від нижчого до вищого</option>
                </select>
              </div>
              
              <div className="col-md-3">
                <label className="form-label small fw-semibold">Ціна від:</label>
                <input
                  type="number"
                  className="form-control form-control-sm filter-input"
                  placeholder="0"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  min="0"
                />
              </div>
              
              <div className="col-md-3">
                <label className="form-label small fw-semibold">Ціна до:</label>
                <input
                  type="number"
                  className="form-control form-control-sm filter-input"
                  placeholder="1000"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  min="0"
                />
              </div>
            </div>
            
            <div className="row mt-3">
              <div className="col-12">
                <button 
                  onClick={applyFilters}
                  className="btn btn-primary btn-sm me-2"
                >
                  <i className="fas fa-check"></i> Застосувати фільтри
                </button>
                <button 
                  onClick={clearFilters}
                  className="btn btn-outline-secondary btn-sm"
                >
                  <i className="fas fa-refresh"></i> Скинути все
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header