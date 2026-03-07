import { Link } from 'react-router-dom';
import type { MenuItemDisplay } from '../types';

const menuItems: MenuItemDisplay[] = [
  { name: 'Latte', image: '/image/menu-1.png', description: 'A latte is espresso with steamed milk and light foam.', price: '2.5DT' },
  { name: 'Cappucino', image: '/image/menu-2.png', description: 'Cappuccino is espresso with steamed milk and foam.', price: '8.99DT' },
  { name: 'Macchiato', image: '/image/menu-3.png', description: 'Macchiato is espresso topped with a dollop of foam.', price: '8.99DT' },
  { name: 'Espresso', image: '/image/menu-4.png', description: 'Espresso is a rich, concentrated coffee shot.', price: '8.99DT' },
  { name: 'Americano', image: '/image/menu-5.png', description: 'Americano is espresso diluted with hot water.', price: '8.99 DT' },
  { name: 'Double Espresso', image: '/image/menu-6.png', description: 'Double espresso is two shots of rich, concentrated coffee.', price: '8.99DT' },
];

export default function Menu() {
  return (
    <section className="menu-section" id="menu">
      <h1 className="heading">our menu <span>popular menu</span></h1>

      <div className="box-container">
        {menuItems.map((item) => (
          <Link to="/order" className="box" key={item.name}>
            <img src={item.image} alt={item.name} />
            <div className="content">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <span>{item.price}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
