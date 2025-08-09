import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axiosInstance from '../axiosInstance'

const PopularBooksCarousel = () => {
  const [popularBooks, setPopularBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPopularBooks()
  }, [])

  const fetchPopularBooks = async () => {
    try {
      const response = await axiosInstance.get('/books/popular/')
      setPopularBooks(response.data)
    } catch (error) {
      console.error('Error fetching popular books:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating || 0)
    const hasHalfStar = (rating || 0) % 1 !== 0

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<i key={i} className="fas fa-star text-warning"></i>)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<i key={i} className="fas fa-star-half-alt text-warning"></i>)
      } else {
        stars.push(<i key={i} className="far fa-star text-warning"></i>)
      }
    }
    return stars
  }

  if (loading) {
    return (
      <div className="row mb-5">
        <div className="col-12">
          <div className="card">
            <div className="card-body text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Завантаження...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (popularBooks.length === 0) {
    return null
  }

  return (
    <div className="row mb-5">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h4 className="mb-0 text-primary">
              <i className="fas fa-fire me-2"></i>
              Популярні книги
            </h4>
          </div>
          <div className="card-body px-4 py-3">
            <div id="popularBooksCarousel" className="carousel slide" data-bs-ride="carousel" data-bs-interval="5000">
              <div className="carousel-inner">
                {Array.from({ length: Math.ceil(popularBooks.length / 3) }, (_, groupIndex) => (
                  <div key={groupIndex} className={`carousel-item ${groupIndex === 0 ? 'active' : ''}`}>
                    <div className="row g-3">
                      {popularBooks.slice(groupIndex * 3, (groupIndex + 1) * 3).map(book => (
                        <div key={book.id} className="col-lg-4 col-md-6">
                          <div className="card h-100 book-card popular-book-card">
                            <div className="popular-card-wrapper">
                              <div className="popular-book-image">
                                <Link to={`/books/${book.id}`}>
                                  {book.image ? (
                                    <img
                                      src={book.image}
                                      className="popular-book-cover"
                                      alt={book.title}
                                    />
                                  ) : (
                                    <div className="popular-book-placeholder">
                                      <i className="fas fa-book fa-2x text-muted"></i>
                                    </div>
                                  )}
                                </Link>
                              </div>
                              
                              <div className="popular-book-info">
                                <h6 className="popular-book-title fw-bold mb-2" title={book.title}>
                                  <Link to={`/books/${book.id}`} className="text-decoration-none text-dark">
                                    {book.title}
                                  </Link>
                                </h6>
                                
                                <p className="popular-book-author text-muted small mb-2">
                                  <i className="fas fa-user me-1"></i>
                                  {book.author?.map(a => a.name).join(', ')}
                                </p>
                                
                                <div className="popular-book-rating mb-2">
                                  {renderStars(book.average_rating)}
                                  <small className="ms-2 text-warning fw-bold">
                                    {book.average_rating ? `${book.average_rating}` : 'N/A'}
                                  </small>
                                </div>
                                
                                {book.price && (
                                  <p className="popular-book-price text-success fw-bold mb-0">
                                    <i className="fas fa-hryvnia-sign"></i> {book.price} грн
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {popularBooks.length > 3 && (
                <>
                  <button className="carousel-control-prev popular-carousel-control" type="button" data-bs-target="#popularBooksCarousel" data-bs-slide="prev">
                    <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                  </button>
                  <button className="carousel-control-next popular-carousel-control" type="button" data-bs-target="#popularBooksCarousel" data-bs-slide="next">
                    <span className="carousel-control-next-icon" aria-hidden="true"></span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PopularBooksCarousel