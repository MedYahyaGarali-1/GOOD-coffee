import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setMenuOpen(false);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (hash: string) => {
    setMenuOpen(false);
    if (isHomePage) {
      const el = document.querySelector(hash);
      el?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/' + hash);
    }
  };

  return (
    <header className="header">
      <div
        id="menu-btn"
        className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`}
        onClick={() => setMenuOpen(!menuOpen)}
      />

      <Link to="/" className="logo">
        <img src="/logo4.png" alt="GOOD coffee logo" className="logo-img" />
      </Link>

      <nav className={`navbar ${menuOpen ? 'active' : ''}`}>
        <a onClick={() => handleNavClick('#home')}>home</a>
        <a onClick={() => handleNavClick('#about')}>about</a>
        <a onClick={() => handleNavClick('#menu')}>menu</a>
        <a onClick={() => handleNavClick('#review')}>review</a>
        <a onClick={() => handleNavClick('#book')}>book</a>
        <Link to="/order" onClick={() => setMenuOpen(false)}>order</Link>
      </nav>
    </header>
  );
}
