
import { Link, useNavigate } from "react-router-dom";
import { clearSession, getStoredUser } from "../session.js";

export default function Navbar() {
  const user = getStoredUser();
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  function handleSectionNavigation(sectionId) {
    if (window.location.pathname !== "/") {
      navigate("/", { state: { scrollTo: sectionId } });
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(null, "", `/#${sectionId}`);
  }

  return (
    <header className="site-navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo">C</span>
        <span>CampusPulse</span>
      </Link>

      <nav className="navbar-links" aria-label="Main navigation">
        <Link to="/">Home</Link>

        <a
          href="/#features"
          onClick={(event) => {
            event.preventDefault();
            handleSectionNavigation("features");
          }}
        >
          Features
        </a>

        <a
          href="/#how-it-works"
          onClick={(event) => {
            event.preventDefault();
            handleSectionNavigation("how-it-works");
          }}
        >
          How it works
        </a>

        {user && (
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
        )}
      </nav>
    </header>
  );
}
