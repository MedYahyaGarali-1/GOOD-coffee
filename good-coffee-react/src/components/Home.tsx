import { useState } from 'react';
import { Link } from 'react-router-dom';

const sliderImages = ['/image/1img.png', '/image/2img.png', '/image/home-img-3.png'];

export default function Home() {
  const [mainImage, setMainImage] = useState('/image/1img.png');

  return (
    <section className="home" id="home">
      <div className="row">
        <div className="content">
          <h3>fresh coffee in the morning</h3>
          <Link to="/order" className="btn">buy one now</Link>
        </div>
        <div className="image">
          <img src={mainImage} className="main-home-image" alt="Coffee" />
        </div>
      </div>

      <div className="image-slider">
        {sliderImages.map((src) => (
          <img
            key={src}
            src={src}
            alt="Coffee variant"
            onClick={() => setMainImage(src)}
          />
        ))}
      </div>
    </section>
  );
}
