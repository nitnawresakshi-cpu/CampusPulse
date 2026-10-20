import { Link, useNavigate } from "react-router-dom";
import { clearSession, getStoredUser } from "../session.js";

export default function Navbar() {
  const user = getStoredUser();
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <header className="site-navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo">C</span>
        <span>CampusPulse</span>
      </Link>

      <nav className="navbar-links" aria-label="Main navigation">
        <Link to="/#features">Features</Link>
        <Link to="/#how-it-works">How it works</Link>

        {user ? (
          <>
            <Link
              to={
                user.role === "admin"
                  ? "/admin"
                  : user.role === "staff"
                    ? "/staff"
                    : "/dashboard"
              }
            >
              Dashboard
            </Link>
            <span className="navbar-user">{user.name}</span>
            <button
              type="button"
              className="navbar-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="navbar-register">
              Get started ↗
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
