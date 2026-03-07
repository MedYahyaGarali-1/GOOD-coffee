import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import LandingPage from './components/LandingPage';
import OrderPage from './components/OrderPage';
import StaffDashboard from './components/StaffDashboard';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/order"
          element={
            <>
              <OrderPage />
              <Footer />
            </>
          }
        />
        <Route
          path="/staff"
          element={
            <>
              <StaffDashboard />
              <Footer />
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
