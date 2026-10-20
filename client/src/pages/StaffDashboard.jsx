
import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { clearSession, getStoredUser } from "../session";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STATUSES = ["Assigned", "In Progress", "Resolved"];

function StaffDashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [success, setSuccess] = useState("");
  const [filters, setFilters] = useState("All");

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  const loadComplaints = useCallback(async () => {
    const token = sessionStorage.getItem("campusPulseToken");

    if (!token) {
      clearSession();
      navigate("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/complaints/staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        clearSession();
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not load complaints.");
      }

      setComplaints(data.complaints || []);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const updateComplaint = async (complaint) => {
    const status = complaint.nextStatus || complaint.status;
    const resolutionNotes = complaint.editNotes ?? complaint.resolutionNotes ?? "";

    if (status === "Resolved" && !resolutionNotes.trim()) {
      setError("Please enter resolution notes before resolving this complaint.");
      return;
    }

    const token = sessionStorage.getItem("campusPulseToken");

    setSavingId(complaint._id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/complaints/staff/${complaint._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, resolutionNotes }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        clearSession();
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not update complaint.");
      }

      setSuccess(`Complaint ${data.complaint.complaintId} updated successfully.`);
      await loadComplaints();
    } catch (err) {
      setError(err.message || "Unable to update complaint.");
    } finally {
      setSavingId("");
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "staff") {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  const visibleComplaints =
    filters === "All"
      ? complaints
      : complaints.filter((complaint) => complaint.status === filters);

  const resolvedCount = complaints.filter(
    (complaint) => complaint.status === "Resolved"
  ).length;

  const openCount = complaints.length - resolvedCount;

  return (
    <div className="dashboard-page">
      <nav className="navbar">
        <div className="container nav-content">
          <a className="logo" href="/">
            CampusPulse
          </a>

          <div className="nav-links">
            <span className="nav-user">
              {user.name} Â· Staff
            </span>
            <button className="btn-primary" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="container dashboard-container">
        <section className="dashboard-header">
          <div>
            <p className="staff-eyebrow">STAFF WORKSPACE</p>
            <h1>Complaint Management</h1>
            <p>Review complaints, update progress, and record resolutions.</p>
            {user.department && (
              <p>
                <strong>Department:</strong> {user.department}
              </p>
            )}
          </div>

          <button
            className="btn-primary"
            onClick={loadComplaints}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        {error && <div className="staff-alert staff-alert-error">{error}</div>}
        {success && <div className="staff-alert staff-alert-success">{success}</div>}

        <section className="staff-stats">
          <article className="staff-stat-card">
            <span>Total Department Complaints</span>
            <strong>{complaints.length}</strong>
          </article>
          <article className="staff-stat-card">
            <span>Awaiting Resolution</span>
            <strong>{openCount}</strong>
          </article>
          <article className="staff-stat-card">
            <span>Resolved</span>
            <strong>{resolvedCount}</strong>
          </article>
        </section>

        <section className="staff-complaints-section">
          <div className="staff-list-header">
            <div>
              <h2>Department Complaints</h2>
              <p>Open a complaint below to review and update it.</p>
            </div>

            <select
              aria-label="Filter complaints by status"
              value={filters}
              onChange={(event) => setFilters(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Reopened">Reopened</option>
            </select>
          </div>

          {loading ? (
            <p className="staff-empty-state">Loading complaints...</p>
          ) : visibleComplaints.length === 0 ? (
            <div className="staff-empty-state">
              <h3>No complaints found</h3>
              <p>
                There are no complaints matching this filter in your department.
              </p>
            </div>
          ) : (
            <div className="staff-complaint-list">
              {visibleComplaints.map((complaint) => (
                <article className="staff-complaint-card" key={complaint._id}>
                  <div className="staff-complaint-top">
                    <div>
                      <span className="staff-complaint-id">
                        {complaint.complaintId}
                      </span>
                      <h3>{complaint.title}</h3>
                    </div>
                    <span
                      className={`staff-status staff-status-${complaint.status
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {complaint.status}
                    </span>
                  </div>

                  <p className="staff-complaint-description">
                    {complaint.description}
                  </p>

                  <div className="staff-complaint-meta">
                    <span><strong>Priority:</strong> {complaint.priority || "Not set"}</span>
                    <span>
  <strong>Deadline:</strong>{" "}
  {complaint.dueDate
    ? new Date(complaint.dueDate).toLocaleString()
    : "Not assigned"}
</span>

{complaint.dueDate &&
  new Date(complaint.dueDate) < new Date() &&
  complaint.status !== "Resolved" && (
    <span style={{ color: "#dc2626", fontWeight: 700 }}>
      OVERDUE
    </span>
  )}
                    <span><strong>Category:</strong> {complaint.category}</span>
                    <span><strong>Location:</strong> {complaint.location}</span>
                    <span>
                      <strong>Submitted:</strong>{" "}
                      {new Date(complaint.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <label htmlFor={`status-${complaint._id}`}>
                    Update status
                  </label>
                  <select
                    id={`status-${complaint._id}`}
                    value={complaint.nextStatus || complaint.status}
                    onChange={(event) => {
                      const nextStatus = event.target.value;
                      setComplaints((previous) =>
                        previous.map((item) =>
                          item._id === complaint._id
                            ? { ...item, nextStatus }
                            : item
                        )
                      );
                    }}
                    disabled={savingId === complaint._id}
                  >
                    {STATUSES.map((status) => (
                      <option value={status} key={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <label htmlFor={`notes-${complaint._id}`}>
                    Resolution notes
                  </label>
                  <textarea
                    id={`notes-${complaint._id}`}
                    rows="3"
                    maxLength="3000"
                    placeholder="Describe the action taken or resolution..."
                    value={complaint.editNotes ?? complaint.resolutionNotes ?? ""}
                    onChange={(event) => {
                      const editNotes = event.target.value;
                      setComplaints((previous) =>
                        previous.map((item) =>
                          item._id === complaint._id
                            ? { ...item, editNotes }
                            : item
                        )
                      );
                    }}
                    disabled={savingId === complaint._id}
                  />

                  <button
                    className="btn-primary staff-save-button"
                    onClick={() => updateComplaint(complaint)}
                    disabled={savingId === complaint._id}
                  >
                    {savingId === complaint._id ? "Saving..." : "Save Changes"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default StaffDashboard;

