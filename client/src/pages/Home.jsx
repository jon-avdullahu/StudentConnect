import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home">
      <header className="home-header">
        <h1>StudentConnect</h1>
        <p className="tagline">Affordable housing & roommates for students in Kosovo</p>
        {user ? (
          <div className="user-bar">
            <span>Hello, {user.full_name}</span>
            <Link to="/logout" className="btn btn-ghost">Sign out</Link>
          </div>
        ) : (
          <div className="cta">
            <Link to="/login" className="btn">Sign in</Link>
            <Link to="/register" className="btn btn-primary">Get started</Link>
          </div>
        )}
      </header>
      <main className="home-main">
        {user ? (
          <section className="dashboard-placeholder">
            <h2>Welcome back</h2>
            <p>Your dashboard and housing listings will appear here. User registration and login are now in place.</p>
          </section>
        ) : (
          <section className="hero">
            <p>Create an account to search for housing and find compatible roommates near your university.</p>
          </section>
        )}
      </main>
    </div>
  );
}
