
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { dashboardPath, storeSession } from "../session.js";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedRole = searchParams.get("role")?.toLowerCase();
  const selectedRole = ["student", "staff", "admin"].includes(requestedRole)
    ? requestedRole
    : "student";

  const roleLabels = {
    student: "Student Portal",
    staff: "Staff Portal",
    admin: "Admin Portal",
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (!data.token || !data.user?.name || !data.user?.email) {
        throw new Error("Login succeeded but user details were missing.");
      }

      // The backend determines the user's actual role.
      const actualRole = data.user.role?.toLowerCase();

      if (actualRole !== selectedRole) {
        throw new Error(
          `This account is not registered for the ${roleLabels[selectedRole]}. Please select the correct portal.`
        );
      }

      const authenticatedUser = {
        ...data.user,
        role: actualRole,
      };

      storeSession(data.token, {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        department: data.user.department || "",
        role: actualRole,
      });

      navigate(dashboardPath(authenticatedUser), { replace: true });
    } catch (error) {
      setMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the server. Check that your backend is running."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">
          <span className="logo-icon">C</span>
          CampusPulse
        </Link>

        <p className="section-kicker">WELCOME BACK</p>
        <h1>Sign in to your campus.</h1>

        <p className="auth-description">
          Access your selected portal to continue.
        </p>

        <div className="selected-portal">
          <strong>{roleLabels[selectedRole]}</strong>
          <p>
            {selectedRole === "student"
              ? "Report campus issues and track their progress."
              : selectedRole === "staff"
                ? "Manage assigned complaints and update their status."
                : "Monitor complaints and manage campus operations."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="you@college.edu"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {message && (
            <p role="alert" style={{ color: "#dc2626" }}>
              {message}
            </p>
          )}

          <button
            className="btn-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : `Sign in as ${selectedRole}`}
          </button>
        </form>

        {selectedRole === "student" && (
          <p className="auth-switch">
            New to CampusPulse?{" "}
            <Link to="/register">Create an account</Link>
          </p>
        )}

        <div className="portal-switch">
          <p>Looking for a different portal?</p>

          <div>
            <Link to="/login?role=student">Student</Link>
            <span>·</span>
            <Link to="/login?role=staff">Staff</Link>
            <span>·</span>
            <Link to="/login?role=admin">Admin</Link>
          </div>
        </div>

        <Link to="/" className="back-home">
          ← Back to homepage
        </Link>
      </section>
    </main>
  );
}

export default Login;
