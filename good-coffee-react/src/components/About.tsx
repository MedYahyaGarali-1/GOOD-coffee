export default function About() {
  return (
    <section className="about" id="about">
      <h1 className="heading">about us <span>why choose us</span></h1>

      <div className="row">
        <div className="image">
          <img src="/image/about-img.png" alt="About" />
        </div>

        <div className="content">
          <h3 className="title">what's make our coffee special!</h3>
          <p>
            At GOOD Coffee, we use only the finest, sustainably sourced beans,
            freshly roasted for a bold, authentic flavor. Each cup is crafted
            with precision, bringing out the unique notes in every brew. Our
            commitment to quality ensures that every sip is a special experience.
          </p>
          <a href="#menu" className="btn">read more</a>
          <div className="icons-container">
            <div className="icons">
              <img src="/image/about-icon-1.png" alt="Quality Coffee" />
              <h3>quality coffee</h3>
            </div>
            <div className="icons">
              <img src="/image/about-icon-2.png" alt="Our Branches" />
              <h3>our branches</h3>
            </div>
            <div className="icons">
              <img src="/image/about-icon-3.png" alt="Free Delivery" />
              <h3>free delivery</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
