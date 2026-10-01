
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        const response = await api.get("/attendance/today");
        setAttendance(response.data);
      } catch (error) {
        console.error("Dashboard loading error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const firstName =
    user?.full_name?.split(" ")[0] || "User";

  const openStudents = () => {
    console.log("STUDENT MANAGEMENT CLICKED");
    window.location.href = "/students";
  };

  return (
    <div className="min-vh-100 bg-light">

      {/* NAVBAR */}
      <nav className="navbar navbar-dark bg-primary shadow-sm">
        <div className="container-fluid px-4">

          <span className="navbar-brand fw-bold">
            🤖 AI Face Attendance
          </span>

          <div className="d-flex align-items-center gap-3">

            <span className="text-white">
              {user?.full_name || "User"}
            </span>

            <button
              type="button"
              className="btn btn-light btn-sm"
              onClick={logout}
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

              {/* DASHBOARD */}
              <button
                type="button"
                className="btn btn-primary text-start"
                onClick={() => navigate("/dashboard")}
              >
                🏠 Dashboard
              </button>

              {/* STUDENT MANAGEMENT */}
              <button
                type="button"
                className="btn btn-danger text-start"
                style={{
                  position: "relative",
                  zIndex: 99999,
                  pointerEvents: "auto",
                  cursor: "pointer"
                }}
                onClick={openStudents}
              >
                👨‍🎓 Student Management
              </button>

              {/* ATTENDANCE HISTORY */}
              <button
                type="button"
                className="btn btn-outline-success text-start"
                onClick={() =>
                  navigate("/attendance-records")
                }
              >
                📋 Attendance History
              </button>

              {/* FACE ENROLLMENT */}
              <button
                type="button"
                className="btn btn-outline-primary text-start"
                onClick={() =>
                  navigate("/face-enrollment")
                }
              >
                👤 Face Enrollment
              </button>

              {/* FACE RECOGNITION */}
              <button
                type="button"
                className="btn btn-outline-primary text-start"
                onClick={() =>
                  navigate("/face-recognition")
                }
              >
                🔍 Face Recognition
              </button>

              {/* LIVENESS */}
              <button
                type="button"
                className="btn btn-outline-primary text-start"
                onClick={() =>
                  navigate("/liveness")
                }
              >
                🛡️ Liveness Detection
              </button>

              {/* CLASSROOM ATTENDANCE */}
              <button
                type="button"
                className="btn btn-outline-success text-start"
                onClick={() =>
                  navigate("/classroom-attendance")
                }
              >
                🏫 Classroom Attendance
              </button>

            </div>

          </aside>

          {/* MAIN CONTENT */}
          <main className="col-lg-10 p-4 p-lg-5">

            <div className="mb-4">

              <h2 className="fw-bold">
                Welcome, {firstName} 👋
              </h2>

              <p className="text-muted mb-0">
                Manage your AI-powered face attendance system
                from one place.
              </p>

            </div>

            {/* STATISTICS */}
            <div className="row g-4 mb-4">

              {/* TODAY'S STATUS */}
              <div className="col-md-4">

                <div className="card border-0 shadow-sm h-100">

                  <div className="card-body">

                    <div className="text-muted">
                      Today's Status
                    </div>

                    <h3 className="fw-bold mt-2">
                      {loading
                        ? "..."
                        : attendance?.status ||
                          "Not Marked"}
                    </h3>

                  </div>

                </div>

              </div>

              {/* ATTENDANCE METHOD */}
              <div className="col-md-4">

                <div className="card border-0 shadow-sm h-100">

                  <div className="card-body">

                    <div className="text-muted">
                      Attendance Method
                    </div>

                    <h3 className="fw-bold mt-2">
                      AI Recognition
                    </h3>

                  </div>

                </div>

              </div>

              {/* SYSTEM */}
              <div className="col-md-4">

                <div className="card border-0 shadow-sm h-100">

                  <div className="card-body">

                    <div className="text-muted">
                      System
                    </div>

                    <h3 className="fw-bold mt-2">
                      Online
                    </h3>

                  </div>

                </div>

              </div>

            </div>

            {/* CLASSROOM + STUDENT MANAGEMENT */}
            <div className="row g-4 mb-4">

              {/* CLASSROOM */}
              <div className="col-lg-8">

                <div className="card border-0 shadow-sm h-100">

                  <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-center mb-3">

                      <div>

                        <h4 className="fw-bold mb-1">
                          Classroom Attendance
                        </h4>

                        <p className="text-muted mb-0">
                          Take one classroom photo and
                          recognize multiple students.
                        </p>

                      </div>

                      <span className="fs-1">
                        🏫
                      </span>

                    </div>

                    <div className="alert alert-info">

                      <strong>
                        How it works
                      </strong>

                      <ol className="mb-0 mt-2">

                        <li>
                          Start the classroom camera.
                        </li>

                        <li>
                          Take one photo of the classroom.
                        </li>

                        <li>
                          AI detects multiple faces.
                        </li>

                        <li>
                          Recognized students are marked
                          present.
                        </li>

                        <li>
                          Teacher can manually mark
                          unrecognized students.
                        </li>

                      </ol>

                    </div>

                    <button
                      type="button"
                      className="btn btn-success btn-lg w-100"
                      onClick={() =>
                        navigate("/classroom-attendance")
                      }
                    >
                      📷 Start Classroom Attendance
                    </button>

                  </div>

                </div>

              </div>

              {/* STUDENT MANAGEMENT */}
              <div className="col-lg-4">

                <div className="card border-0 shadow-sm h-100">

                  <div className="card-body p-4">

                    <h5 className="fw-bold mb-3">
                      Student Management
                    </h5>

                    <p className="text-muted">
                      Create, update, view and manage
                      student records.
                    </p>

                    <button
                      type="button"
                      className="btn btn-danger w-100 mb-3"
                      style={{
                        position: "relative",
                        zIndex: 99999,
                        pointerEvents: "auto",
                        cursor: "pointer"
                      }}
                      onClick={openStudents}
                    >
                      👨‍🎓 Manage Students
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-primary w-100"
                      onClick={() =>
                        navigate("/face-enrollment")
                      }
                    >
                      👤 Enroll Student Face
                    </button>

                  </div>

                </div>

              </div>

            </div>

            {/* ATTENDANCE HISTORY */}
            <div className="row g-4 mb-4">

              <div className="col-12">

                <div className="card border-0 shadow-sm">

                  <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">

                      <div>

                        <h4 className="fw-bold mb-1">
                          📋 Attendance History
                        </h4>

                        <p className="text-muted mb-0">
                          View all saved attendance records,
                          student check-in times and AI
                          recognition confidence.
                        </p>

                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-lg"
                        onClick={() =>
                          navigate("/attendance-records")
                        }
                      >
                        📋 View Attendance History
                      </button>

                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* AI TOOLS + TODAY'S ATTENDANCE */}
            <div className="row g-4">

              {/* AI TOOLS */}
              <div className="col-lg-4">

                <div className="card border-0 shadow-sm h-100">

                  <div className="card-body p-4">

                    <h5 className="fw-bold mb-3">
                      AI Tools
                    </h5>

                    <div className="d-grid gap-2">

                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() =>
                          navigate("/face-enrollment")
                        }
                      >
                        👤 Enroll Face
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() =>
                          navigate("/face-recognition")
                        }
                      >
                        🔍 Recognize Face
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() =>
                          navigate("/liveness")
                        }
                      >
                        🛡️ Check Liveness
                      </button>

                    </div>

                  </div>

                </div>

              </div>

              {/* TODAY'S ATTENDANCE */}
              <div className="col-lg-8">

                <div className="card border-0 shadow-sm h-100">

                  <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-center">

                      <h5 className="fw-bold mb-0">
                        Today's Attendance
                      </h5>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() =>
                          navigate("/attendance-records")
                        }
                      >
                        View History
                      </button>

                    </div>

                    {attendance ? (

                      <div className="mt-3">

                        <div className="alert alert-success mb-0">
                          Attendance information loaded
                          successfully.
                        </div>

                      </div>

                    ) : (

                      <p className="text-muted mt-3 mb-0">
                        No attendance record available yet.
                      </p>

                    )}

                  </div>

                </div>

              </div>

            </div>

          </main>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;
