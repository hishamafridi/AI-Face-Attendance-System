import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function StudentManagement() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    student_id: "",
    email: "",
    department: "",
    class_name: "",
    phone: "",
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/students");

      const data = response.data;

      if (Array.isArray(data)) {
        setStudents(data);
      } else if (Array.isArray(data?.students)) {
        setStudents(data.students);
      } else if (Array.isArray(data?.data)) {
        setStudents(data.data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Student loading error:", error);

      setStudents([]);

      setError(
        error.response?.data?.detail ||
          "Could not load students."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      full_name: "",
      student_id: "",
      email: "",
      department: "",
      class_name: "",
      phone: "",
    });

    setEditingStudent(null);
  };

  const openCreateForm = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (student) => {
    setForm({
      full_name: student.full_name || "",
      student_id: student.student_id || "",
      email: student.email || "",
      department: student.department || "",
      class_name: student.class_name || "",
      phone: student.phone || "",
    });

    setEditingStudent(student);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      if (editingStudent) {
        const response = await api.put(
          `/students/${editingStudent.id}`,
          form
        );

        setStudents((previous) =>
          previous.map((student) =>
            student.id === editingStudent.id
              ? response.data
              : student
          )
        );

        setSuccess("Student updated successfully.");
      } else {
        const response = await api.post(
          "/students",
          form
        );

        setStudents((previous) => [
          response.data,
          ...previous,
        ]);

        setSuccess("Student created successfully.");
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error("Student save error:", error);

      setError(
        error.response?.data?.detail ||
          "Could not save student."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.full_name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(`/students/${student.id}`);

      setStudents((previous) =>
        previous.filter(
          (item) => item.id !== student.id
        )
      );

      setSuccess("Student deleted successfully.");
    } catch (error) {
      console.error("Student delete error:", error);

      setError(
        error.response?.data?.detail ||
          "Could not delete student."
      );
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  const activeStudents = students.filter(
    (student) => student.is_active !== false
  );

  const departments = new Set(
    students
      .map((student) => student.department)
      .filter(Boolean)
  );

  const classes = new Set(
    students
      .map((student) => student.class_name)
      .filter(Boolean)
  );

  return (
    <div className="min-vh-100 bg-light">

      {/* TOP NAVBAR */}
      <nav className="navbar navbar-dark bg-primary shadow-sm">
        <div className="container-fluid px-4">

          <button
            className="navbar-brand fw-bold border-0 bg-transparent text-white"
            onClick={() => navigate("/dashboard")}
            type="button"
          >
            🤖 AI Face Attendance
          </button>

          <div className="d-flex align-items-center gap-3">

            <button
              className="btn btn-light btn-sm"
              onClick={() => navigate("/dashboard")}
              type="button"
            >
              ← Dashboard
            </button>

            <button
              className="btn btn-outline-light btn-sm"
              onClick={logout}
              type="button"
            >
              Logout
            </button>

          </div>

        </div>
      </nav>

      <div className="container-fluid">

        <div className="row">

          {/* SIDEBAR */}
          <aside className="col-lg-2 bg-white border-end min-vh-100 p-3">

            <h6 className="text-muted text-uppercase mb-3">
              Navigation
            </h6>

            <div className="d-grid gap-2">

              <button
                className="btn btn-outline-primary text-start"
                onClick={() => navigate("/dashboard")}
                type="button"
              >
                🏠 Dashboard
              </button>

              <button
                className="btn btn-primary text-start"
                type="button"
              >
                👨‍🎓 Student Management
              </button>

              <button
                className="btn btn-outline-primary text-start"
                onClick={() =>
                  navigate("/face-enrollment")
                }
                type="button"
              >
                👤 Face Enrollment
              </button>

              <button
                className="btn btn-outline-primary text-start"
                onClick={() =>
                  navigate("/face-recognition")
                }
                type="button"
              >
                🔍 Face Recognition
              </button>

              <button
                className="btn btn-outline-primary text-start"
                onClick={() =>
                  navigate("/liveness")
                }
                type="button"
              >
                🛡️ Liveness Detection
              </button>

              <button
                className="btn btn-outline-success text-start"
                onClick={() =>
                  navigate("/classroom-attendance")
                }
                type="button"
              >
                🏫 Classroom Attendance
              </button>

            </div>

          </aside>

          {/* MAIN CONTENT */}
          <main className="col-lg-10 p-4 p-lg-5">

            {/* PAGE HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4">

              <div>
                <div className="text-primary fw-bold small">
                  STUDENT MANAGEMENT
                </div>

                <h1 className="fw-bold mb-2">
                  Students
                </h1>

                <p className="text-muted mb-0">
                  Create, manage and maintain student
                  records for the attendance system.
                </p>
              </div>

              <button
                className="btn btn-primary btn-lg"
                onClick={openCreateForm}
                type="button"
              >
                + Add Student
              </button>

            </div>

            {/* ALERTS */}
            {error && (
              <div className="alert alert-danger shadow-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success shadow-sm">
                {success}
              </div>
            )}

            {/* STATISTICS */}
            <div className="row g-4 mb-4">

              <div className="col-md-3">

                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">

                    <div className="text-muted">
                      Total Students
                    </div>

                    <h2 className="fw-bold mt-2 mb-0">
                      {students.length}
                    </h2>

                  </div>
                </div>

              </div>

              <div className="col-md-3">

                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">

                    <div className="text-muted">
                      Active Students
                    </div>

                    <h2 className="fw-bold mt-2 mb-0">
                      {activeStudents.length}
                    </h2>

                  </div>
                </div>

              </div>

              <div className="col-md-3">

                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">

                    <div className="text-muted">
                      Departments
                    </div>

                    <h2 className="fw-bold mt-2 mb-0">
                      {departments.size}
                    </h2>

                  </div>
                </div>

              </div>

              <div className="col-md-3">

                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">

                    <div className="text-muted">
                      Classes
                    </div>

                    <h2 className="fw-bold mt-2 mb-0">
                      {classes.size}
                    </h2>

                  </div>
                </div>

              </div>

            </div>

            {/* ADD / EDIT FORM */}
            {showForm && (
              <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                  <div className="d-flex justify-content-between align-items-center mb-4">

                    <div>
                      <h4 className="fw-bold mb-1">
                        {editingStudent
                          ? "Edit Student"
                          : "Add New Student"}
                      </h4>

                      <p className="text-muted mb-0">
                        Enter the student information below.
                      </p>
                    </div>

                    <button
                      className="btn btn-outline-secondary"
                      onClick={closeForm}
                      type="button"
                    >
                      Close
                    </button>

                  </div>

                  <form onSubmit={handleSubmit}>

                    <div className="row g-3">

                      <div className="col-md-6">

                        <label className="form-label fw-semibold">
                          Full Name
                        </label>

                        <input
                          className="form-control"
                          type="text"
                          name="full_name"
                          value={form.full_name}
                          onChange={handleChange}
                          placeholder="Enter full name"
                          required
                        />

                      </div>

                      <div className="col-md-6">

                        <label className="form-label fw-semibold">
                          Student ID
                        </label>

                        <input
                          className="form-control"
                          type="text"
                          name="student_id"
                          value={form.student_id}
                          onChange={handleChange}
                          placeholder="Enter student ID"
                          required
                        />

                      </div>

                      <div className="col-md-6">

                        <label className="form-label fw-semibold">
                          Email
                        </label>

                        <input
                          className="form-control"
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="student@example.com"
                          required
                        />

                      </div>

                      <div className="col-md-6">

                        <label className="form-label fw-semibold">
                          Phone
                        </label>

                        <input
                          className="form-control"
                          type="text"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="Enter phone number"
                        />

                      </div>

                      <div className="col-md-6">

                        <label className="form-label fw-semibold">
                          Department
                        </label>

                        <input
                          className="form-control"
                          type="text"
                          name="department"
                          value={form.department}
                          onChange={handleChange}
                          placeholder="e.g. Software Engineering"
                          required
                        />

                      </div>

                      <div className="col-md-6">

                        <label className="form-label fw-semibold">
                          Class
                        </label>

                        <input
                          className="form-control"
                          type="text"
                          name="class_name"
                          value={form.class_name}
                          onChange={handleChange}
                          placeholder="e.g. BSSE-6A"
                          required
                        />

                      </div>

                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-4">

                      <button
                        className="btn btn-outline-secondary"
                        onClick={closeForm}
                        type="button"
                      >
                        Cancel
                      </button>

                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={saving}
                      >
                        {saving
                          ? "Saving..."
                          : editingStudent
                            ? "Update Student"
                            : "Create Student"}
                      </button>

                    </div>

                  </form>

                </div>

              </div>
            )}

            {/* STUDENT DIRECTORY */}
            <div className="card border-0 shadow-sm">

              <div className="card-body p-0">

                <div className="p-4 border-bottom d-flex justify-content-between align-items-center">

                  <div>
                    <h4 className="fw-bold mb-1">
                      Student Directory
                    </h4>

                    <p className="text-muted mb-0">
                      All students registered in the system.
                    </p>
                  </div>

                  <button
                    className="btn btn-outline-primary"
                    onClick={loadStudents}
                    disabled={loading}
                    type="button"
                  >
                    ↻ Refresh
                  </button>

                </div>

                {/* LOADING */}
                {loading ? (

                  <div className="text-center p-5">

                    <div
                      className="spinner-border text-primary"
                      role="status"
                    ></div>

                    <p className="text-muted mt-3 mb-0">
                      Loading students...
                    </p>

                  </div>

                ) : students.length === 0 ? (

                  /* EMPTY STATE */
                  <div className="text-center p-5">

                    <div className="fs-1 mb-3">
                      👨‍🎓
                    </div>

                    <h4 className="fw-bold">
                      No Students Found
                    </h4>

                    <p className="text-muted">
                      Add your first student to start
                      managing student records.
                    </p>

                    <button
                      className="btn btn-primary"
                      onClick={openCreateForm}
                      type="button"
                    >
                      + Add First Student
                    </button>

                  </div>

                ) : (

                  /* TABLE */
                  <div className="table-responsive">

                    <table className="table table-hover align-middle mb-0">

                      <thead className="table-light">

                        <tr>
                          <th>Student</th>
                          <th>Student ID</th>
                          <th>Email</th>
                          <th>Department</th>
                          <th>Class</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>

                      </thead>

                      <tbody>

                        {students.map((student) => (

                          <tr key={student.id}>

                            <td>
                              <strong>
                                {student.full_name}
                              </strong>

                              <br />

                              <small className="text-muted">
                                ID #{student.id}
                              </small>
                            </td>

                            <td>
                              <span className="badge text-bg-light">
                                {student.student_id}
                              </span>
                            </td>

                            <td>
                              {student.email}
                            </td>

                            <td>
                              {student.department}
                            </td>

                            <td>
                              {student.class_name}
                            </td>

                            <td>
                              {student.phone || "—"}
                            </td>

                            <td>

                              <span
                                className={
                                  student.is_active === false
                                    ? "badge text-bg-secondary"
                                    : "badge text-bg-success"
                                }
                              >
                                {student.is_active === false
                                  ? "Inactive"
                                  : "Active"}
                              </span>

                            </td>

                            <td>

                              <div className="d-flex gap-2">

                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() =>
                                    openEditForm(student)
                                  }
                                  type="button"
                                >
                                  Edit
                                </button>

                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() =>
                                    handleDelete(student)
                                  }
                                  type="button"
                                >
                                  Delete
                                </button>

                              </div>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

            </div>

          </main>

        </div>

      </div>

    </div>
  );
}

export default StudentManagement;