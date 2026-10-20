
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

export default function Home() {
  return (
    <div className="app">
      <Navbar />

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="status-dot" />
              YOUR CAMPUS, YOUR VOICE
            </div>

            <h1>
              Better campus.
              <br />
              <span>Starts with you.</span>
            </h1>

            <p className="hero-description">
              Report campus issues, track progress, and help make
              your college a better place for everyone.
            </p>

            <div className="hero-actions">
              <Link
                className="btn-primary btn-large"
                to="/login?role=student"
              >
                Report an issue ↗
              </Link>

              <a className="text-link" href="#how-it-works">
                See how it works →
              </a>
            </div>

            <div className="trust-note">
              <span className="trust-icon">✓</span>
              One platform. Every campus concern.
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-orb orb-one" />
            <div className="visual-orb orb-two" />

            <div className="preview-card">
              <div className="preview-header">
                <div>
                  <p className="preview-label">CAMPUS OVERVIEW</p>
                  <h2>Issue tracker</h2>
                </div>

                <span className="live-badge">
                  <span className="status-dot" /> Demo
                </span>
              </div>

              <div className="stat-grid">
                <div className="stat-card">
                  <span className="stat-icon blue">◎</span>
                  <p>Total reported</p>
                  <strong>128</strong>
                </div>

                <div className="stat-card">
                  <span className="stat-icon orange">◷</span>
                  <p>In progress</p>
                  <strong>24</strong>
                </div>

                <div className="stat-card">
                  <span className="stat-icon green">✓</span>
                  <p>Resolved</p>
                  <strong>96</strong>
                </div>

                <div className="stat-card">
                  <span className="stat-icon purple">↗</span>
                  <p>Departments</p>
                  <strong>08</strong>
                </div>
              </div>

              <div className="recent-issue">
                <div className="issue-heading">
                  <strong>Recent activity</strong>
                  <span>Sample data</span>
                </div>

                <div className="issue-row">
                  <span className="issue-marker marker-orange" />
                  <div className="issue-info">
                    <strong>Classroom projector</strong>
                    <span>Academic Block · Room 204</span>
                  </div>
                  <span className="issue-status status-progress">
                    In progress
                  </span>
                </div>

                <div className="issue-row">
                  <span className="issue-marker marker-green" />
                  <div className="issue-info">
                    <strong>Water cooler maintenance</strong>
                    <span>Library · Ground floor</span>
                  </div>
                  <span className="issue-status status-resolved">
                    Resolved
                  </span>
                </div>
              </div>

              <p className="demo-note">
                Illustrative preview · Sample data
              </p>
            </div>
          </div>
        </section>

        <section className="portal-section" id="portals">
          <div className="section-heading">
            <span className="section-kicker">
              YOUR CAMPUS, YOUR PORTAL
            </span>
            <h2>Welcome to CampusPulse.</h2>
            <p>Choose your portal to continue securely.</p>
          </div>

          <div className="portal-grid">
            <article className="portal-card">
              <div className="portal-icon">🎓</div>
              <h3>Student Portal</h3>
              <p>
                Submit campus complaints and track their progress.
              </p>

              <Link
                className="btn-primary"
                to="/login?role=student"
              >
                Student Login →
              </Link>

              <Link className="portal-register" to="/register">
                Create account
              </Link>
            </article>

            <article className="portal-card">
              <div className="portal-icon">🛠️</div>
              <h3>Staff Portal</h3>
              <p>
                Review department complaints and update their status.
              </p>

              <Link
                className="btn-primary"
                to="/login?role=staff"
              >
                Staff Login →
              </Link>
            </article>

            <article className="portal-card">
              <div className="portal-icon">🛡️</div>
              <h3>Admin Portal</h3>
              <p>
                Access administrative tools for campus management.
              </p>

              <Link
                className="btn-primary"
                to="/login?role=admin"
              >
                Admin Login →
              </Link>
            </article>
          </div>

          <p className="portal-security-note">
            🔒 Secure sign-in · Role-based access
          </p>
        </section>

        <section className="features" id="features">
          <div className="section-heading">
            <span className="section-kicker">
              BUILT FOR YOUR CAMPUS
            </span>
            <h2>Small issues deserve real solutions.</h2>
            <p>
              Everything you need to raise concerns and follow them
              through to resolution.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-icon">↗</span>
              <h3>Report easily</h3>
              <p>
                Submit campus complaints with locations, categories,
                and supporting details.
              </p>
            </article>

            <article className="feature-card">
              <span className="feature-icon">◎</span>
              <h3>Track progress</h3>
              <p>
                Follow your complaint from submission through
                resolution.
              </p>
            </article>

            <article className="feature-card">
              <span className="feature-icon">✓</span>
              <h3>See real action</h3>
              <p>
                Help staff and administrators manage issues with
                clear updates and accountability.
              </p>
            </article>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <span className="section-kicker">SIMPLE BY DESIGN</span>
          <h2>From concern to resolution.</h2>

          <div className="steps">
            <div>
              <span>01</span>
              <strong>Report an issue</strong>
            </div>

            <div>
              <span>02</span>
              <strong>Staff takes action</strong>
            </div>

            <div>
              <span>03</span>
              <strong>Track the resolution</strong>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
