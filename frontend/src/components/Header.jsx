import React from 'react'
import Button from './Button'



const Header = () => {
  return (
    <>
      <nav className='navbar container pt-3 pb-3 align-items-start'>
        <a className='navbar-brand' href='#'>BookStore</a>

        <div>
            <Button text='Логін' class='btn-outline-info' />
            &nbsp;
            <Button text='Реєстрація' class='btn-info' />
        </div>
      </nav>
    </>
  )
}

export default Header