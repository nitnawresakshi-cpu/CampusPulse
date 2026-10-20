
import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { clearSession, getStoredUser } from "../session.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const DEPARTMENTS = [
  "Cyber Security",
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Mechanical",
  "Civil",
  "Other",
];

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  throw new Error(
    text.startsWith("<")
      ? "The server returned HTML instead of JSON. Check the backend URL and restart the server."
      : text || "Unexpected server response."
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [error, setError] = useState("");
  const [staffMessage, setStaffMessage] = useState("");
  const [staffError, setStaffError] = useState("");
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [savingDepartmentId, setSavingDepartmentId] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "Cyber Security",
  });

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const loadAdminData = useCallback(async () => {
    const token = sessionStorage.getItem("campusPulseToken");

    if (!token) {
      clearSession();
      navigate("/login?role=admin", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsResponse, complaintsResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, { headers }),
        fetch(`${API_URL}/api/admin/complaints`, { headers }),
      ]);

      if (statsResponse.status === 401 || complaintsResponse.status === 401) {
        clearSession();
        navigate("/login?role=admin", { replace: true });
        return;
      }

      const statsData = await readResponse(statsResponse);
      const complaintsData = await readResponse(complaintsResponse);

      if (!statsResponse.ok) {
        throw new Error(statsData.message || "Could not load statistics.");
      }

      if (!complaintsResponse.ok) {
        throw new Error(
          complaintsData.message || "Could not load complaints."
        );
      }

      setStats(statsData);
      setComplaints(complaintsData.complaints || []);
    } catch (err) {
      setError(err.message || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const loadStaff = useCallback(async () => {
    const token = sessionStorage.getItem("campusPulseToken");
    if (!token) return;

    setStaffLoading(true);
    setStaffError("");

    try {
      const response = await fetch(`${API_URL}/api/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readResponse(response);

      if (response.status === 401) {
        clearSession();
        navigate("/login?role=admin", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not load staff accounts.");
      }

      setStaff(data.staff || []);
    } catch (err) {
      setStaffError(err.message || "Could not load staff accounts.");
    } finally {
      setStaffLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAdminData();
    loadStaff();
  }, [loadAdminData, loadStaff]);

  if (!user) {
    return <Navigate to="/login?role=admin" replace />;
  }

  if (user.role !== "admin") {
    return (
      <Navigate
        to={user.role === "staff" ? "/staff" : "/dashboard"}
        replace
      />
    );
  }

  async function createStaff(event) {
    event.preventDefault();
    setStaffError("");
    setStaffMessage("");

    const token = sessionStorage.getItem("campusPulseToken");
    if (!token) {
      clearSession();
      navigate("/login?role=admin", { replace: true });
      return;
    }

    setCreatingStaff(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(staffForm),
      });

      const data = await readResponse(response);

      if (response.status === 401) {
        clearSession();
        navigate("/login?role=admin", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not create staff account.");
      }

      setStaffMessage(
        `Staff account created for ${data.staff.name} (${data.staff.department}).`
      );
      setStaffForm({
        name: "",
        email: "",
        password: "",
        department: "Cyber Security",
      });
      await loadStaff();
    } catch (err) {
      setStaffError(err.message || "Could not create staff account.");
    } finally {
      setCreatingStaff(false);
    }
  }

  async function updateDepartment(staffMember, department) {
    if (department === staffMember.department) return;

    setStaffError("");
    setStaffMessage("");
    setSavingDepartmentId(staffMember._id);

    try {
      const token = sessionStorage.getItem("campusPulseToken");
      const response = await fetch(
        `${API_URL}/api/admin/staff/${staffMember._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ department }),
        }
      );

      const data = await readResponse(response);

      if (response.status === 401) {
        clearSession();
        navigate("/login?role=admin", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not update department.");
      }

      setStaff((previous) =>
        previous.map((item) =>
          item._id === staffMember._id ? data.staff : item
        )
      );
      setStaffMessage(
        `${staffMember.name}'s department updated to ${department}.`
      );
    } catch (err) {
      setStaffError(err.message || "Could not update department.");
    } finally {
      setSavingDepartmentId("");
    }
  }

  const visibleComplaints = complaints.filter((complaint) => {
    const matchesStatus =
      filter === "All" || complaint.status === filter;
    const query = search.trim().toLowerCase();
    const studentName =
      typeof complaint.student === "object"
        ? complaint.student?.name || ""
        : "";

    const matchesSearch =
      !query ||
      [
        complaint.complaintId,
        complaint.title,
        complaint.category,
        complaint.department,
        complaint.location,
        studentName,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="dashboard-page admin-page">
      <nav className="navbar">
        <div className="container nav-content">
          <Link className="logo" to="/">
            CampusPulse <span>Admin</span>
          </Link>

          <div className="nav-links">
            <span className="nav-user">{user.name} · Admin</span>
            <button className="btn-primary" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="container dashboard-container">
        <section className="dashboard-header">
          <div>
            <p className="staff-eyebrow">ADMINISTRATOR WORKSPACE</p>
            <h1>Campus Overview</h1>
            <p>Monitor campus complaints and their resolution progress.</p>
          </div>

          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              loadAdminData();
              loadStaff();
            }}
            disabled={loading || staffLoading}
          >
            {loading || staffLoading ? "Refreshing..." : "Refresh Data"}
          </button>
        </section>

        {error && (
          <div className="staff-alert staff-alert-error" role="alert">
            {error}
          </div>
        )}

        <section className="staff-stats">
          <article className="staff-stat-card">
            <span>Total Complaints</span>
            <strong>{stats?.total ?? "—"}</strong>
          </article>
          <article className="staff-stat-card">
            <span>Pending</span>
            <strong>{stats?.pending ?? "—"}</strong>
          </article>
          <article className="staff-stat-card">
            <span>In Progress</span>
            <strong>{stats?.inProgress ?? "—"}</strong>
          </article>
          <article className="staff-stat-card">
            <span>Resolved</span>
            <strong>{stats?.resolved ?? "—"}</strong>
          </article>
          <article className="staff-stat-card">
            <span>Overdue Complaints</span>
            <strong>{stats?.overdue ?? "—"}</strong>
          </article>
        </section>

        {stats && (
          <section className="staff-complaints-section">
            <h2>Complaint Breakdown</h2>
            <div className="admin-breakdown">
              <article className="staff-stat-card">
                <span>Reopened</span>
                <strong>{stats.reopened ?? 0}</strong>
              </article>
              <article className="staff-stat-card">
                <span>High Priority</span>
                <strong>
                  {(stats.byPriority?.High || 0) +
                    (stats.byPriority?.Urgent || 0)}
                </strong>
              </article>
              <article className="staff-stat-card">
                <span>Categories</span>
                <strong>
                  {Object.keys(stats.byCategory || {}).length}
                </strong>
              </article>
            </div>
          </section>
        )}

        <section className="staff-complaints-section">
          <div className="staff-list-header">
            <div>
              <h2>All Complaints</h2>
              <p>Search records and filter by current status.</p>
            </div>

            <div className="admin-filters">
              <input
                type="search"
                aria-label="Search complaints"
                placeholder="Search ID, title, student..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                aria-label="Filter by complaint status"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Reopened">Reopened</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="staff-empty-state">Loading admin data...</p>
          ) : visibleComplaints.length === 0 ? (
            <div className="staff-empty-state">
              <h3>No complaints found</h3>
              <p>Try another search or status filter.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th>Student</th>
                    <th>Category / Department</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleComplaints.map((complaint) => (
                    <tr key={complaint._id}>
                      <td>
                        <strong>{complaint.complaintId}</strong>
                        <div>{complaint.title}</div>
                        <small>{complaint.location}</small>
                      </td>
                      <td>
                        {typeof complaint.student === "object"
                          ? complaint.student?.name || "Unknown"
                          : "Unknown"}
                        <small>
                          {typeof complaint.student === "object"
                            ? complaint.student?.email || ""
                            : ""}
                        </small>
                      </td>
                      <td>
                        {complaint.category}
                        <small>{complaint.department || "Unassigned"}</small>
                      </td>
                      <td>{complaint.priority}</td>
                      <td>
                        <span className="admin-status">
                          {complaint.status}
                        </span>
                      </td>
                      <td>
                        {complaint.createdAt
                          ? new Date(complaint.createdAt).toLocaleDateString()
                          : "Unavailable"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="admin-result-count">
            Showing {visibleComplaints.length} of {complaints.length} complaints
          </p>
        </section>

        <section className="staff-complaints-section" id="staff-management">
          <div className="staff-list-header">
            <div>
              <p className="staff-eyebrow">TEAM ADMINISTRATION</p>
              <h2>Staff Management</h2>
              <p>Create staff accounts and assign department responsibilities.</p>
            </div>
            <span className="staff-count-pill">
              {staff.length} staff {staff.length === 1 ? "member" : "members"}
            </span>
          </div>

          {staffMessage && (
            <div className="staff-alert staff-alert-success" role="status">
              {staffMessage}
            </div>
          )}
          {staffError && (
            <div className="staff-alert staff-alert-error" role="alert">
              {staffError}
            </div>
          )}

          <form className="staff-create-form" onSubmit={createStaff}>
            <h3>Create Staff Account</h3>
            <div className="staff-form-grid">
              <label>
                Full name
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(event) =>
                    setStaffForm({ ...staffForm, name: event.target.value })
                  }
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                Email address
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(event) =>
                    setStaffForm({ ...staffForm, email: event.target.value })
                  }
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Temporary password
                <input
                  type="password"
                  value={staffForm.password}
                  onChange={(event) =>
                    setStaffForm({ ...staffForm, password: event.target.value })
                  }
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
                <small>Use at least 12 characters and share it securely.</small>
              </label>

              <label>
                Department
                <select
                  value={staffForm.department}
                  onChange={(event) =>
                    setStaffForm({
                      ...staffForm,
                      department: event.target.value,
                    })
                  }
                  required
                >
                  {DEPARTMENTS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              className="btn-primary"
              type="submit"
              disabled={creatingStaff}
            >
              {creatingStaff ? "Creating Account..." : "Create Staff Account"}
            </button>
          </form>

          <div className="staff-directory">
            <div className="staff-directory-heading">
              <h3>Existing Staff</h3>
              <button
                className="staff-secondary-button"
                type="button"
                onClick={loadStaff}
                disabled={staffLoading}
              >
                {staffLoading ? "Loading..." : "Refresh Staff"}
              </button>
            </div>

            {staffLoading && staff.length === 0 ? (
              <p className="staff-empty-state">Loading staff accounts...</p>
            ) : staff.length === 0 ? (
              <div className="staff-empty-state">
                <h3>No staff accounts found</h3>
                <p>Create a staff account using the form above.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Staff member</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((member) => (
                      <tr key={member._id}>
                        <td>
                          <strong>{member.name}</strong>
                        </td>
                        <td>{member.email}</td>
                        <td>
                          <select
                            aria-label={`Department for ${member.name}`}
                            value={member.department || ""}
                            disabled={savingDepartmentId === member._id}
                            onChange={(event) =>
                              updateDepartment(member, event.target.value)
                            }
                          >
                            {!DEPARTMENTS.includes(member.department) && (
                              <option value={member.department || ""}>
                                {member.department || "Unassigned"}
                              </option>
                            )}
                            {DEPARTMENTS.map((department) => (
                              <option key={department} value={department}>
                                {department}
                              </option>
                            ))}
                          </select>
                          {savingDepartmentId === member._id && (
                            <small>Saving...</small>
                          )}
                        </td>
                        <td>
                          <span className="admin-status">{member.role}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
