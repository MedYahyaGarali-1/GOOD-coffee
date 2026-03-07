import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Home from './Home';
import About from './About';
import Menu from './Menu';
import Review from './Review';
import Book from './Book';
import Footer from './Footer';

export default function LandingPage() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const el = document.querySelector(location.hash);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location]);

  return (
    <>
      <Home />
      <About />
      <Menu />
      <Review />
      <Book />
      <Footer />
    </>
  );
}
