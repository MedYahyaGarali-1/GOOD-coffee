import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import LandingPage from './components/LandingPage';
import OrderPage from './components/OrderPage';
import StaffDashboard from './components/StaffDashboard';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import './App.css';

function AppLayout() {
  const location = useLocation();
  const hideHeader = location.pathname === '/staff' || location.pathname === '/admin';

  return (
    <>
      <ScrollToTop />
      {!hideHeader && <Header />}
      <div className={!hideHeader ? 'main-content' : ''}>
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
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
