import { Link, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">FitLink</p>
          <h1>Web App</h1>
        </div>
        <nav className="nav">
          <Link to="/login">Login</Link>
          <Link to="/">Homepage</Link>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function LoginPage() {
  return (
    <section className="card">
      <p className="eyebrow">Welcome back</p>
      <h2>Login</h2>
      <p className="muted">This is a basic login screen placeholder.</p>
      <button type="button" className="primary-button">
        Sign in
      </button>
    </section>
  );
}

function HomePage() {
  return (
    <section className="card">
      <p className="eyebrow">Main view</p>
      <h2>Homepage</h2>
      <p className="muted">Nothing special for now.</p>
    </section>
  );
}

export default App;
