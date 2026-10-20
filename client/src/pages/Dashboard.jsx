
import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  clearSession,
  getStoredUser,
} from "../session.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CATEGORIES = [
  "Electricity",
  "Water Supply",
  "Cleanliness",
  "Classroom",
  "Hostel",
  "Internet",
  "Laboratory",
  "Library",
  "Washroom",
  "Other",
];

function formatRole(role) {
  if (!role) return "Student";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

  return parsed.toLocaleString();
}

function getStatusClass(status) {
  if (status === "Resolved") return "status-resolved";

  if (status === "In Progress" || status === "Assigned") {
    return "status-progress";
  }

  return "";
}

function Dashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceInputKey, setEvidenceInputKey] = useState(0);
  const [feedbackRatings, setFeedbackRatings] = useState({});
  const [feedbackComments, setFeedbackComments] = useState({});
  const [reopenReasons, setReopenReasons] = useState({});
  const [actionLoading, setActionLoading] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Other",
    location: "",
  });

  const token = sessionStorage.getItem("campusPulseToken");

  // Load complaints belonging to the logged-in student.
  const loadComplaints = useCallback(async () => {
    if (!token) {
      setError("Your session is missing. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/complaints/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        clearSession();
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not load complaints.");
      }

      setComplaints(data.complaints || []);
      setError("");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the server. Check that the backend is running."
          : err.message || "Could not load complaints."
      );
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  // Load notifications belonging to the logged-in student.
  const loadNotifications = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        clearSession();
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error("Could not load notifications.");
      }

      const data = await response.json();

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Notification loading error:", err.message);
    }
  }, [token, navigate]);

  // Effects run only after their referenced functions are initialized.
  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "student") {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin" : "/staff"}
        replace
      />
    );
  }

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  
async function handleSubmit(event) {
  event.preventDefault();
  setError("");
  setSuccess("");

  if (!token) {
    setError("Your session is missing. Please log in again.");
    return;
  }

  if (evidenceFile) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        evidenceFile.type
      )
    ) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (evidenceFile.size > 5 * 1024 * 1024) {
      setError("The image must be 5 MB or smaller.");
      return;
    }
  }

  setSubmitting(true);

  try {
    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value);
    });

    if (evidenceFile) {
      formData.append("evidence", evidenceFile);
    }

    const response = await fetch(`${API_URL}/api/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (response.status === 401) {
      clearSession();
      navigate("/login", { replace: true });
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.message || "Could not submit complaint."
      );
    }

    setSuccess(
      `Complaint submitted successfully. ID: ${data.complaint.complaintId}`
    );

    setForm({
      title: "",
      description: "",
      
      category: "Other",
      location: "",
    });

    setEvidenceFile(null);
    setEvidenceInputKey((current) => current + 1);

    await loadComplaints();
    await loadNotifications();
  } catch (err) {
    setError(
      err.message === "Failed to fetch"
        ? "Cannot connect to the server. Check that the backend is running."
        : err.message || "Could not submit complaint."
    );
  } finally {
    setSubmitting(false);
  }
}


  async function handleMarkAsRead(notificationId) {
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not mark notification as read.");
      }

      await loadNotifications();
    } catch (err) {
      console.error("Mark notification read error:", err.message);
    }
  }
  
async function handleFeedback(complaint) {
  const rating = Number(feedbackRatings[complaint._id]);
  const comment = feedbackComments[complaint._id] || "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    setError("Please select a rating from 1 to 5 stars.");
    return;
  }

  setActionLoading(complaint._id);
  setError("");
  setSuccess("");

  try {
    const response = await fetch(
      `${API_URL}/api/complaints/${complaint._id}/feedback`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not submit feedback.");
    }

    setSuccess("Feedback submitted successfully.");
    await loadComplaints();
  } catch (err) {
    setError(err.message || "Could not submit feedback.");
  } finally {
    setActionLoading("");
  }
}

async function handleReopen(complaint) {
  const reason = (reopenReasons[complaint._id] || "").trim();

  if (!reason) {
    setError("Please explain why this complaint needs reopening.");
    return;
  }

  setActionLoading(complaint._id);
  setError("");
  setSuccess("");

  try {
    const response = await fetch(
      `${API_URL}/api/complaints/${complaint._id}/reopen`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not reopen complaint.");
    }

    setSuccess("Complaint reopened successfully.");
    await loadComplaints();
    await loadNotifications();
  } catch (err) {
    setError(err.message || "Could not reopen complaint.");
  } finally {
    setActionLoading("");
  }
}

  return (
    <div className="app">
      <header className="navbar">
        <a className="logo" href="/dashboard">
          <span className="logo-icon">C</span>
          CampusPulse
        </a>

        <nav className="nav-links">
          <a href="/dashboard">Dashboard</a>
          <a href="/">Home</a>
        </nav>

        <div className="nav-actions">
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              setShowNotifications((current) => !current);
              loadNotifications();
            }}
            aria-expanded={showNotifications}
          >
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>

          <span className="btn-login">{user.email}</span>

          <button
            className="btn-primary"
            type="button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <main>
        {showNotifications && (
          <section className="features">
            <div className="section-heading">
              <span className="section-kicker">UPDATES</span>
              <h2>Your notifications</h2>
            </div>

            <div className="feature-card">
              {notifications.length === 0 ? (
                <p>No notifications yet.</p>
              ) : (
                notifications.map((notification) => (
                  <article
                    key={notification._id}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <p>{notification.message}</p>

                    {notification.complaint && (
                      <p>
                        <strong>Complaint:</strong>{" "}
                        {notification.complaint.complaintId || "Complaint"}
                        {" — "}
                        {notification.complaint.title}
                      </p>
                    )}

                    <small>{formatDate(notification.createdAt)}</small>

                    {!notification.read && (
                      <div>
                        <button
                          className="btn-primary"
                          type="button"
                          style={{ marginTop: 8 }}
                          onClick={() => handleMarkAsRead(notification._id)}
                        >
                          Mark as read
                        </button>
                      </div>
                    )}

                    {notification.read && (
                      <p>
                        <small>Read</small>
                      </p>
                    )}
                  </article>
                ))
              )}

              <button
                className="btn-primary"
                type="button"
                style={{ marginTop: 16 }}
                onClick={loadNotifications}
              >
                Refresh notifications
              </button>
            </div>
          </section>
        )}

        <section className="features">
          <div className="section-heading">
            <span className="section-kicker">YOUR CAMPUS DASHBOARD</span>
            <h2>Welcome back, {user.name}</h2>
            <p>
              Report campus issues, track their progress, and follow updates
              from one place.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <span className="section-kicker">PROFILE</span>
              <h3>{user.name}</h3>
              <p>
                Email: {user.email}
                <br />
                Department: {user.department || "Not specified"}
                <br />
                Role: {formatRole(user.role)}
              </p>
            </article>

            <article className="feature-card">
              <span className="section-kicker">MY COMPLAINTS</span>
              <h3>{complaints.length}</h3>
              <p>Total complaints submitted by your account.</p>
            </article>

            <article className="feature-card">
              <span className="section-kicker">RESOLVED</span>
              <h3>
                {complaints.filter((item) => item.status === "Resolved").length}
              </h3>
              <p>Complaints marked as resolved.</p>
            </article>
          </div>
        </section>

        <section className="features">
          <div className="section-heading">
            <span className="section-kicker">NEW REQUEST</span>
            <h2>Report a campus issue</h2>
            <p>
              Describe the problem and where it occurred. Your complaint will
              be saved to the CampusPulse database.
            </p>
          </div>

          <div className="feature-card">
            <form className="complaint-form" onSubmit={handleSubmit}>
              <label htmlFor="complaint-title">Complaint title</label>
              <input
                id="complaint-title"
                name="title"
                type="text"
                placeholder="e.g. Water leakage near classroom"
                value={form.title}
                onChange={handleChange}
                maxLength={120}
                required
              />

              <label htmlFor="complaint-category">Category</label>
              <select
                id="complaint-category"
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <label htmlFor="complaint-location">Campus location</label>
              <input
                id="complaint-location"
                name="location"
                type="text"
                placeholder="e.g. Block A, second floor"
                value={form.location}
                onChange={handleChange}
                maxLength={200}
                required
              />

              
<label htmlFor="complaint-description">Description</label>
<textarea
  id="complaint-description"
  name="description"
  placeholder="Explain the problem and any relevant details..."
  value={form.description}
  onChange={handleChange}
  maxLength={3000}
  rows={5}
  required
/>

<label htmlFor="complaint-evidence">
  Evidence image (optional)
</label>
<input
  key={evidenceInputKey}
  id="complaint-evidence"
  name="evidence"
  type="file"
  accept="image/jpeg,image/png,image/webp"
  onChange={(event) =>
    setEvidenceFile(event.target.files?.[0] || null)
  }
/>
<small>JPG, PNG, or WebP. Maximum size: 5 MB.</small>


              <button
                className="btn-primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit complaint"}
              </button>
            </form>

            {success && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  position: "fixed",
                  top: "24px",
                  right: "24px",
                  zIndex: 9999,
                  width: "min(420px, calc(100vw - 32px))",
                  padding: "20px",
                  background: "#ffffff",
                  border: "1px solid #bbf7d0",
                  borderLeft: "5px solid #16a34a",
                  borderRadius: "12px",
                  boxShadow: "0 12px 35px rgba(0, 0, 0, 0.16)",
                  color: "#166534",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <strong>✓ Complaint submitted successfully</strong>
                  <button
                    type="button"
                    onClick={() => setSuccess("")}
                    aria-label="Dismiss message"
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: "20px",
                      color: "#166534",
                    }}
                  >
                    ×
                  </button>
                </div>

                <p style={{ margin: "10px 0 0", overflowWrap: "anywhere" }}>
                  {success}
                </p>
              </div>
            )}

            {error && (
              <p role="alert" style={{ color: "#b42318", marginTop: 16 }}>
                {error}
              </p>
            )}
          </div>
        </section>

        <section className="features">
          <div className="section-heading">
            <span className="section-kicker">COMPLAINT TRACKER</span>
            <h2>Your submitted complaints</h2>
            <p>
              These records are retrieved from the database for your logged-in
              account.
            </p>
          </div>

          {loading ? (
            <div className="feature-card">
              <p>Loading your complaints...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="feature-card">
              <h3>No complaints yet</h3>
              <p>
                Submit your first campus complaint using the form above.
              </p>
            </div>
          ) : (
            <div className="feature-grid">
              {complaints.map((complaint) => (
                <article className="feature-card" key={complaint._id}>
                  <span className="section-kicker">
                    {complaint.complaintId}
                  </span>

                  <h3>{complaint.title}</h3>
                  <p>{complaint.description}</p>

                  <p style={{ marginTop: 14 }}>
                    <strong>Category:</strong> {complaint.category}
                    <br />
                    <strong>Location:</strong> {complaint.location}
                    <br />
                    <strong>Department:</strong>{" "}
                    {complaint.department || "Not assigned"}
                    <br />
                    <strong>Priority:</strong> {complaint.priority}
                    <br />
                    <strong>Deadline:</strong>{" "}
                    {complaint.dueDate
                      ? formatDate(complaint.dueDate)
                      : "Not assigned"}
                  </p>

                  {complaint.dueDate &&
                    new Date(complaint.dueDate) < new Date() &&
                    complaint.status !== "Resolved" && (
                      <div style={{ color: "#dc2626", fontWeight: 700 }}>
                        OVERDUE
                      </div>
                    )}

                  <p>
                    <strong>Submitted:</strong>{" "}
                    {formatDate(complaint.createdAt)}
                  </p>

                  <div style={{ marginTop: 16 }}>
                    <span
                      className={`issue-status ${getStatusClass(
                        complaint.status
                      )}`}
                    >
                      {complaint.status}
                    </span>
                  </div>

                  {complaint.resolutionNotes && (
                    <p style={{ marginTop: 14 }}>
                      <strong>Resolution notes:</strong>{" "}
                      {complaint.resolutionNotes}
                    </p>
                  )}
                  
{complaint.status === "Resolved" && (
  <div style={{ marginTop: 20, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
    <h3>Resolution Feedback</h3>

    {complaint.feedback?.submittedAt ? (
      <div>
        <p>
          <strong>Your rating:</strong>{" "}
          {"★".repeat(complaint.feedback.rating || 0)}
          {"☆".repeat(5 - (complaint.feedback.rating || 0))}
        </p>
        {complaint.feedback.comment && (
          <p>{complaint.feedback.comment}</p>
        )}
        <p>Thank you for your feedback!</p>
      </div>
    ) : (
      <div>
        <label htmlFor={`rating-${complaint._id}`}>
          Rate the resolution (1–5)
        </label>
        <select
          id={`rating-${complaint._id}`}
          value={feedbackRatings[complaint._id] || ""}
          onChange={(event) =>
            setFeedbackRatings((old) => ({
              ...old,
              [complaint._id]: event.target.value,
            }))
          }
        >
          <option value="">Select rating</option>
          <option value="1">1 - Poor</option>
          <option value="2">2 - Fair</option>
          <option value="3">3 - Good</option>
          <option value="4">4 - Very good</option>
          <option value="5">5 - Excellent</option>
        </select>

        <label htmlFor={`feedback-${complaint._id}`}>
          Comments (optional)
        </label>
        <textarea
          id={`feedback-${complaint._id}`}
          maxLength={1000}
          rows={3}
          value={feedbackComments[complaint._id] || ""}
          onChange={(event) =>
            setFeedbackComments((old) => ({
              ...old,
              [complaint._id]: event.target.value,
            }))
          }
          placeholder="Tell us about the resolution..."
        />

        <button
          className="btn-primary"
          type="button"
          disabled={actionLoading === complaint._id}
          onClick={() => handleFeedback(complaint)}
        >
          {actionLoading === complaint._id
            ? "Submitting..."
            : "Submit Feedback"}
        </button>
      </div>
    )}

    <h3 style={{ marginTop: 20 }}>Problem not fixed?</h3>
    
    <label htmlFor={`reopen-${complaint._id}`}>
      Reason for reopening
    </label>
    <textarea
      id={`reopen-${complaint._id}`}
      maxLength={1000}
      rows={3}
      value={reopenReasons[complaint._id] || ""}
      onChange={(event) =>
        setReopenReasons((old) => ({
          ...old,
          [complaint._id]: event.target.value,
        }))
      }
      placeholder="Explain why the issue remains unresolved..."
    />

    <button
      className="btn-primary"
      type="button"
      disabled={actionLoading === complaint._id}
      onClick={() => handleReopen(complaint)}
    >
      {actionLoading === complaint._id
        ? "Processing..."
        : "Request Reopening"}
    </button>
  </div>
)}

                </article>
              ))}
            </div>
          )}

          {!loading && (
            <button
              className="btn-primary"
              type="button"
              style={{ marginTop: 20 }}
              onClick={loadComplaints}
            >
              Refresh complaints
            </button>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
