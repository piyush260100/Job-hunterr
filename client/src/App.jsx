import { Routes, Route, NavLink } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PreferencesPage from './pages/PreferencesPage.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import StatusBanner from './components/StatusBanner.jsx';

export default function App() {
  return (
    <div>
      <nav className="nav">
        <span className="brand">Job Hunter</span>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/profile">Profile</NavLink>
        <NavLink to="/preferences">Preferences</NavLink>
      </nav>
      <StatusBanner />
      <div className="container">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
        </Routes>
      </div>
    </div>
  );
}
