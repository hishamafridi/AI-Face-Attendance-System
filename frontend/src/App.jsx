
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import FaceEnrollment from "./pages/FaceEnrollment";
import FaceRecognition from "./pages/FaceRecognition";
import LivenessCheck from "./pages/LivenessCheck";
import ClassroomAttendance from "./pages/ClassroomAttendance";
import Students from "./pages/Students";
import AttendanceRecords from "./pages/AttendanceRecords";

function App() {
  return (
    <Routes>

      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/dashboard"
        element={<Dashboard />}
      />

      <Route
        path="/students"
        element={<Students />}
      />

      <Route
        path="/attendance-records"
        element={<AttendanceRecords />}
      />

      <Route
        path="/face-enrollment"
        element={<FaceEnrollment />}
      />

      <Route
        path="/face-recognition"
        element={<FaceRecognition />}
      />

      <Route
        path="/liveness"
        element={<LivenessCheck />}
      />

      <Route
        path="/classroom-attendance"
        element={<ClassroomAttendance />}
      />

    </Routes>
  );
}

export default App;
