import { useNavigate, useLocation } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (hash: string) => {
    if (location.pathname === '/') {
      const el = document.querySelector(hash);
      el?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/' + hash);
    }
  };

  return (
    <section className="footer">
      <div className="box-container">
        <div className="box">
          <h3>our branches</h3>
          <a><i className="fas fa-arrow-right" /> Nabeul</a>
          <a><i className="fas fa-arrow-right" /> Comming soon...</a>
        </div>

        <div className="box">
          <h3>quick links</h3>
          <a onClick={() => handleNavClick('#home')}><i className="fas fa-arrow-right" /> home</a>
          <a onClick={() => handleNavClick('#about')}><i className="fas fa-arrow-right" /> about</a>
          <a onClick={() => handleNavClick('#menu')}><i className="fas fa-arrow-right" /> menu</a>
          <a onClick={() => handleNavClick('#review')}><i className="fas fa-arrow-right" /> review</a>
          <a onClick={() => handleNavClick('#book')}><i className="fas fa-arrow-right" /> book</a>
        </div>

        <div className="box">
          <h3>contact info</h3>
          <a href="tel:+21623156890"><i className="fas fa-phone" /> +216 23156890</a>
          <a href="mailto:goodcoffeeshops1@gmail.com"><i className="fas fa-envelope" /> goodcoffeeshops1@gmail.com</a>
        </div>

        <div className="box">
          <h3>follow us</h3>
          <a href="https://www.facebook.com/profile.php?id=61553929593153&locale=fr_FR" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f" /> facebook</a>
          <a href="https://www.instagram.com/goodcoffee__official/" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram" /> instagram</a>
        </div>
      </div>

      <div className="credit">created by <span>Med Yahya Garali</span> | all rights reserved</div>
    </section>
  );
}
