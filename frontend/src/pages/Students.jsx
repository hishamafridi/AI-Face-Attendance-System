
import { useEffect, useState } from "react";
import api from "../services/api";

function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/students");

      setStudents(response.data.students || []);
    } catch (err) {
      console.error(err);

      if (err.response?.status === 401) {
        setError("You are not logged in. Please login again.");
      } else {
        setError(
          err.response?.data?.detail ||
            "Failed to load students."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  return (
    <div className="container-fluid py-4">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Student Management
          </h2>

          <p className="text-muted mb-0">
            View registered students
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={loadStudents}
        >
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-5">
          <div
            className="spinner-border text-primary"
            role="status"
          ></div>

          <p className="mt-3 text-muted">
            Loading students...
          </p>
        </div>
      ) : (
        <>
          {/* Statistics */}
          <div className="row mb-4">

            <div className="col-md-4">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted">
                    Total Students
                  </h6>

                  <h2 className="fw-bold">
                    {students.length}
                  </h2>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted">
                    Active Students
                  </h6>

                  <h2 className="fw-bold text-success">
                    {
                      students.filter(
                        (student) => student.is_active
                      ).length
                    }
                  </h2>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted">
                    Inactive Students
                  </h6>

                  <h2 className="fw-bold text-danger">
                    {
                      students.filter(
                        (student) => !student.is_active
                      ).length
                    }
                  </h2>
                </div>
              </div>
            </div>

          </div>

          {/* Student Table */}
          <div className="card shadow-sm border-0">

            <div className="card-header bg-white py-3">
              <h5 className="mb-0 fw-bold">
                Registered Students
              </h5>
            </div>

            <div className="card-body p-0">

              {students.length === 0 ? (
                <div className="text-center py-5">
                  <h5>No students found</h5>

                  <p className="text-muted">
                    There are currently no students in the system.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">

                  <table className="table table-hover align-middle mb-0">

                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Class</th>
                        <th>Phone</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>

                      {students.map((student, index) => (
                        <tr key={student.id}>

                          <td>
                            {index + 1}
                          </td>

                          <td>
                            <strong>
                              {student.student_id}
                            </strong>
                          </td>

                          <td>
                            {student.full_name}
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
                            {student.phone || "-"}
                          </td>

                          <td>
                            {student.is_active ? (
                              <span className="badge bg-success">
                                Active
                              </span>
                            ) : (
                              <span className="badge bg-danger">
                                Inactive
                              </span>
                            )}
                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Students;
