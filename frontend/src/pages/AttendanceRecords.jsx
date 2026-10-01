
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function AttendanceRecords() {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/attendance");

      console.log("Attendance response:", response.data);

      setRecords(response.data.attendance || []);
    } catch (error) {
      console.error("Attendance error:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Failed to load attendance records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const formatDateTime = (value) => {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleString();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >

        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: "#1f2937",
              }}
            >
              Attendance Records
            </h1>

            <p
              style={{
                color: "#6b7280",
              }}
            >
              View student attendance records
            </p>
          </div>

          <button
            onClick={loadAttendance}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#2563eb",
              color: "white",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div
            style={{
              background: "white",
              padding: "40px",
              textAlign: "center",
              borderRadius: "10px",
            }}
          >
            Loading attendance records...
          </div>
        ) : (
          <div
            style={{
              background: "white",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >

            {/* SUMMARY */}
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <strong>
                Total Records: {records.length}
              </strong>
            </div>

            {/* NO RECORDS */}
            {records.length === 0 ? (
              <div
                style={{
                  padding: "60px",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                <h3>No Attendance Records</h3>

                <p>
                  Attendance records will appear here
                  after a student is marked present.
                </p>
              </div>
            ) : (

              /* TABLE */
              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "900px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#f9fafb",
                      }}
                    >
                      <th style={thStyle}>
                        #
                      </th>

                      <th style={thStyle}>
                        Student
                      </th>

                      <th style={thStyle}>
                        Student ID
                      </th>

                      <th style={thStyle}>
                        Date
                      </th>

                      <th style={thStyle}>
                        Check In
                      </th>

                      <th style={thStyle}>
                        Check Out
                      </th>

                      <th style={thStyle}>
                        Status
                      </th>

                      <th style={thStyle}>
                        Confidence
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {records.map((record, index) => (
                      <tr key={record.id}>

                        <td style={tdStyle}>
                          {index + 1}
                        </td>

                        <td style={tdStyle}>
                          {record.student_name || "-"}
                        </td>

                        <td style={tdStyle}>
                          {record.student_id || "-"}
                        </td>

                        <td style={tdStyle}>
                          {record.date || "-"}
                        </td>

                        <td style={tdStyle}>
                          {formatDateTime(
                            record.check_in_time
                          )}
                        </td>

                        <td style={tdStyle}>
                          {formatDateTime(
                            record.check_out_time
                          )}
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              padding: "5px 12px",
                              borderRadius: "20px",
                              background:
                                record.status ===
                                "present"
                                  ? "#dcfce7"
                                  : "#fee2e2",
                              color:
                                record.status ===
                                "present"
                                  ? "#166534"
                                  : "#991b1b",
                              fontWeight: "600",
                              fontSize: "13px",
                            }}
                          >
                            {record.status || "-"}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          {record.confidence !== null &&
                          record.confidence !== undefined
                            ? `${(
                                Number(
                                  record.confidence
                                ) * 100
                              ).toFixed(2)}%`
                            : "-"}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* BACK BUTTON */}
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            marginTop: "20px",
            padding: "10px 18px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "white",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>

      </div>
    </div>
  );
}

const thStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid #e5e7eb",
  textAlign: "left",
  fontSize: "14px",
  color: "#374151",
};

const tdStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "14px",
  color: "#4b5563",
};

export default AttendanceRecords;
