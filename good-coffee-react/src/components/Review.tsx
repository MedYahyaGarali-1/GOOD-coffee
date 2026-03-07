import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

import type { ReviewData } from '../types';

const reviews: ReviewData[] = [
  {
    name: 'Manel Thabet',
    role: 'Waitress',
    image: '/image/manel.png',
    text: "I'm the most loved One in GOOD Coffee.",
    stars: 5,
  },
  {
    name: 'Omar CA',
    role: 'Barista',
    image: '/image/omar.png',
    text: "If you don't like my coffee, Don't search better one.",
    stars: 5,
  },
  {
    name: 'Chiraz charrouz',
    role: 'Waitress & Barista',
    image: '/image/chiraz.png',
    text: 'My kids and then GOOD Coffee.',
    stars: 5,
  },
  {
    name: 'Kamel Garali',
    role: 'Co-founder',
    image: '/image/kamel.png',
    text: 'Every GOOD Coffee is made with love to bring you happiness',
    stars: 5,
  },
];

export default function Review() {
  return (
    <section className="review" id="review">
      <h1 className="heading">reviews <span>what our team says</span></h1>

      <Swiper
        className="review-slider"
        modules={[Pagination, Autoplay]}
        spaceBetween={20}
        pagination={{ clickable: true }}
        loop
        grabCursor
        autoplay={{ delay: 7500, disableOnInteraction: false }}
        breakpoints={{
          0: { slidesPerView: 1 },
          768: { slidesPerView: 2 },
        }}
      >
        {reviews.map((r) => (
          <SwiperSlide className="box" key={r.name}>
            <i className="fas fa-quote-left" />
            <i className="fas fa-quote-right" />
            <img src={r.image} alt={r.name} />
            <div className="stars">
              {Array.from({ length: r.stars }).map((_, i) => (
                <i key={i} className="fas fa-star" />
              ))}
            </div>
            <p>{r.text}</p>
            <h3>{r.name}</h3>
            <span>{r.role}</span>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
