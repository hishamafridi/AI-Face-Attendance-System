import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function ClassroomAttendance() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [students, setStudents] = useState([]);

  const [totalFaces, setTotalFaces] = useState(0);
  const [recognizedCount, setRecognizedCount] = useState(0);
  const [unrecognizedCount, setUnrecognizedCount] = useState(0);
  const [attendanceMarkedCount, setAttendanceMarkedCount] =
    useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ============================================================
  // CLEANUP
  // ============================================================

  useEffect(() => {
    return () => {
      stopCamera();

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  // ============================================================
  // ERROR MESSAGE HELPER
  // ============================================================

  const getErrorMessage = (detail) => {
    if (!detail) {
      return "An unknown error occurred.";
    }

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (item?.msg) {
            const location = Array.isArray(item.loc)
              ? item.loc.join(" -> ")
              : "";

            return location
              ? `${location}: ${item.msg}`
              : item.msg;
          }

          return "Validation error.";
        })
        .join(" | ");
    }

    if (typeof detail === "object") {
      if (detail.msg) {
        return String(detail.msg);
      }

      if (detail.message) {
        return String(detail.message);
      }

      try {
        return JSON.stringify(detail);
      } catch {
        return "Server returned an invalid error.";
      }
    }

    return String(detail);
  };

  // ============================================================
  // CLEAR RESULTS
  // ============================================================

  const clearResults = () => {
    setStudents([]);
    setTotalFaces(0);
    setRecognizedCount(0);
    setUnrecognizedCount(0);
    setAttendanceMarkedCount(0);
  };

  // ============================================================
  // STOP CAMERA
  // ============================================================

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
  };

  // ============================================================
  // START CAMERA
  // ============================================================

  const startCamera = async () => {
    setError("");
    setMessage("");

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera is not supported by this browser."
        );
      }

      stopCamera();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
            facingMode: "user",
          },
          audio: false,
        });

      const videoTrack =
        stream.getVideoTracks()[0];

      if (!videoTrack) {
        throw new Error(
          "No camera video track was found."
        );
      }

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error(
          "Camera video element is not available."
        );
      }

      video.srcObject = stream;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error(
              "Camera video did not load within 5 seconds."
            )
          );
        }, 5000);

        if (video.readyState >= 1) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
      });

      await video.play();

      if (
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        throw new Error(
          "Camera started but no video frames are being received."
        );
      }

      setCameraStarted(true);

      setMessage(
        "Camera started. Make sure all students are clearly visible."
      );
    } catch (err) {
      console.error(
        "Classroom camera error:",
        err
      );

      stopCamera();

      setError(
        err?.message ||
          "Unable to access camera. Please allow camera permission."
      );
    }
  };

  // ============================================================
  // CAPTURE PHOTO
  // ============================================================

  const capturePhoto = () => {
    setError("");
    setMessage("");

    const video = videoRef.current;

    if (!video) {
      setError(
        "Camera video element is not available."
      );
      return;
    }

    if (
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setError(
        "Camera is not ready yet. Please wait."
      );
      return;
    }

    const canvas =
      document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      setError(
        "Unable to create image canvas."
      );
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(
            "Could not create classroom image."
          );
          return;
        }

        const file = new File(
          [blob],
          "classroom-attendance.jpg",
          {
            type: "image/jpeg",
          }
        );

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        const url =
          URL.createObjectURL(blob);

        setImageFile(file);
        setPreviewUrl(url);

        clearResults();
        stopCamera();

        setMessage(
          "Photo captured successfully. Click Analyze Classroom."
        );
      },
      "image/jpeg",
      0.9
    );
  };

  // ============================================================
  // SELECT PHOTO
  // ============================================================

  const selectPhoto = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid image file."
      );
      return;
    }

    stopCamera();

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url =
      URL.createObjectURL(file);

    setImageFile(file);
    setPreviewUrl(url);

    clearResults();

    setError("");
    setMessage(
      "Classroom photo selected."
    );
  };

  // ============================================================
  // ANALYZE CLASSROOM
  // ============================================================

  const analyzeClassroom = async () => {
    if (!imageFile) {
      setError(
        "Please capture or select a classroom photo first."
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    clearResults();

    try {
      const formData = new FormData();

      formData.append(
        "file",
        imageFile,
        imageFile.name ||
          "classroom-attendance.jpg"
      );

      console.log(
        "Sending classroom image to backend..."
      );

      const response = await api.post(
        "/classroom/recognize",
        formData
      );

      console.log(
        "Classroom recognition response:",
        response.data
      );

      const data =
        response.data || {};

      const resultStudents =
        Array.isArray(data.students)
          ? data.students
          : [];

      setStudents(resultStudents);

      setTotalFaces(
        Number(data.total_faces ?? 0)
      );

      setRecognizedCount(
        Number(data.recognized_count ?? 0)
      );

      setUnrecognizedCount(
        Number(data.unrecognized_count ?? 0)
      );

      setAttendanceMarkedCount(
        Number(
          data.attendance_marked_count ?? 0
        )
      );

      setMessage(
        data.message ||
          "Classroom recognition completed successfully."
      );
    } catch (err) {
      console.error(
        "Classroom recognition error:",
        err
      );

      const responseStatus =
        err?.response?.status;

      const detail =
        err?.response?.data?.detail;

      if (responseStatus === 401) {
        setError(
          "Your login session has expired. Please login again."
        );

        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem(
          "user"
        );

        setTimeout(() => {
          navigate("/login");
        }, 1200);

        return;
      }

      if (responseStatus === 404) {
        setError(
          getErrorMessage(detail) ||
            "No enrolled student faces were found."
        );
        return;
      }

      if (responseStatus === 422) {
        setError(
          getErrorMessage(detail) ||
            "The classroom image was rejected by the server."
        );
        return;
      }

      if (responseStatus === 405) {
        setError(
          "The classroom recognition endpoint does not accept this request method."
        );
        return;
      }

      if (detail) {
        setError(
          getErrorMessage(detail)
        );
        return;
      }

      setError(
        "Classroom recognition failed. Check the backend terminal."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // MANUAL MARK PRESENT
  // ============================================================

  const markPresent = (faceNumber) => {
    setStudents(
      (currentStudents) =>
        currentStudents.map(
          (student) => {
            if (
              student?.face_number !==
              faceNumber
            ) {
              return student;
            }

            return {
              ...student,
              manually_marked: true,
              status: "present",
            };
          }
        )
    );

    setMessage(
      `Face ${faceNumber} was manually marked present.`
    );
  };

  // ============================================================
  // RESET
  // ============================================================

  const resetPage = () => {
    stopCamera();

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(null);
    setPreviewUrl("");

    clearResults();

    setError("");
    setMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ============================================================
  // DASHBOARD
  // ============================================================

  const goDashboard = () => {
    resetPage();
    navigate("/dashboard");
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-vh-100 bg-light">

      {/* NAVBAR */}
      <nav className="navbar navbar-dark bg-primary shadow-sm">
        <div className="container">

          <span className="navbar-brand fw-bold">
            AI Face Attendance
          </span>

          <button
            type="button"
            className="btn btn-light"
            onClick={goDashboard}
          >
            Dashboard
          </button>

        </div>
      </nav>

      <main className="container py-5">

        {/* PAGE TITLE */}
        <div className="mb-4">
          <h2 className="fw-bold">
            Classroom Attendance
          </h2>

          <p className="text-muted">
            Capture a classroom photo and let the
            AI recognize enrolled students.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div
            className="alert alert-danger"
            role="alert"
          >
            <strong>Error:</strong>{" "}
            {error}
          </div>
        )}

        {/* MESSAGE */}
        {message && !error && (
          <div
            className="alert alert-success"
            role="alert"
          >
            {message}
          </div>
        )}

        <div className="row g-4">

          {/* LEFT SIDE */}
          <div className="col-lg-8">

            <div className="card border-0 shadow-sm">

              <div className="card-body p-4">

                <h4 className="fw-bold mb-4">
                  Classroom Camera
                </h4>

                {/* CAMERA */}
                <div
                  className="bg-dark rounded overflow-hidden mb-3"
                  style={{
                    minHeight: "350px",
                  }}
                >
                  <video
                    ref={videoRef}
                    className="w-100"
                    style={{
                      minHeight: "350px",
                      objectFit: "cover",
                    }}
                    autoPlay
                    muted
                    playsInline
                  />
                </div>

                {/* CAMERA BUTTONS */}
                <div className="d-flex gap-2 flex-wrap mb-4">

                  {!cameraStarted ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={startCamera}
                      disabled={loading}
                    >
                      Start Camera
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={capturePhoto}
                        disabled={loading}
                      >
                        Capture Classroom
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={stopCamera}
                        disabled={loading}
                      >
                        Stop Camera
                      </button>
                    </>
                  )}

                </div>

                <hr />

                {/* UPLOAD */}
                <h5 className="fw-bold mb-3">
                  Or Select Classroom Photo
                </h5>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control mb-3"
                  accept="image/*"
                  onChange={selectPhoto}
                  disabled={loading}
                />

                {/* PREVIEW */}
                {previewUrl && (
                  <div className="mb-4">

                    <h5 className="fw-bold mb-3">
                      Selected Photo
                    </h5>

                    <img
                      src={previewUrl}
                      alt="Classroom preview"
                      className="img-fluid rounded shadow-sm"
                      style={{
                        maxHeight: "500px",
                        width: "100%",
                        objectFit: "contain",
                        backgroundColor: "#f1f1f1",
                      }}
                    />

                  </div>
                )}

                {/* ANALYZE BUTTON */}
                <div className="d-flex gap-2 flex-wrap">

                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={analyzeClassroom}
                    disabled={
                      !imageFile ||
                      loading
                    }
                  >
                    {loading
                      ? "Analyzing..."
                      : "Analyze Classroom"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-lg"
                    onClick={resetPage}
                    disabled={loading}
                  >
                    New Photo
                  </button>

                </div>

              </div>

            </div>

          </div>

          {/* RIGHT SIDE */}
          <div className="col-lg-4">

            <div className="card border-0 shadow-sm mb-4">

              <div className="card-body p-4">

                <h5 className="fw-bold mb-4">
                  How It Works
                </h5>

                <div className="mb-4">
                  <h6 className="fw-bold">
                    1. Capture
                  </h6>

                  <p className="text-muted small mb-0">
                    Take one clear photo containing
                    the classroom students.
                  </p>
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold">
                    2. Detect
                  </h6>

                  <p className="text-muted small mb-0">
                    AI detects all visible faces.
                  </p>
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold">
                    3. Recognize
                  </h6>

                  <p className="text-muted small mb-0">
                    Each face is compared with
                    enrolled student faces.
                  </p>
                </div>

                <div>
                  <h6 className="fw-bold">
                    4. Attendance
                  </h6>

                  <p className="text-muted small mb-0">
                    Recognized students are
                    automatically marked present.
                  </p>
                </div>

              </div>

            </div>

            <div className="card border-0 shadow-sm">

              <div className="card-body p-4">

                <h5 className="fw-bold mb-3">
                  Photo Guidelines
                </h5>

                <ul className="text-muted small mb-0">

                  <li className="mb-2">
                    Keep faces clearly visible.
                  </li>

                  <li className="mb-2">
                    Use good lighting.
                  </li>

                  <li className="mb-2">
                    Avoid blurry photos.
                  </li>

                  <li className="mb-2">
                    Include as many students as possible.
                  </li>

                  <li>
                    Students should face the camera.
                  </li>

                </ul>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* RESULTS */}
        {/* ================================================== */}

        {students.length > 0 && (

          <div className="card border-0 shadow-sm mt-5">

            <div className="card-body p-4">

              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">

                <div>
                  <h3 className="fw-bold mb-1">
                    Recognition Results
                  </h3>

                  <p className="text-muted mb-0">
                    AI analysis of the classroom photo.
                  </p>
                </div>

                <span className="badge bg-success px-3 py-2">
                  Analysis Complete
                </span>

              </div>

              {/* SUMMARY CARDS */}
              <div className="row g-3 mb-4">

                <div className="col-md-3">

                  <div className="card bg-light border-0 text-center h-100">

                    <div className="card-body">

                      <h2 className="fw-bold">
                        {totalFaces}
                      </h2>

                      <span className="text-muted">
                        Faces Detected
                      </span>

                    </div>

                  </div>

                </div>

                <div className="col-md-3">

                  <div className="card bg-light border-0 text-center h-100">

                    <div className="card-body">

                      <h2 className="fw-bold text-success">
                        {recognizedCount}
                      </h2>

                      <span className="text-muted">
                        Recognized
                      </span>

                    </div>

                  </div>

                </div>

                <div className="col-md-3">

                  <div className="card bg-light border-0 text-center h-100">

                    <div className="card-body">

                      <h2 className="fw-bold text-warning">
                        {unrecognizedCount}
                      </h2>

                      <span className="text-muted">
                        Unknown
                      </span>

                    </div>

                  </div>

                </div>

                <div className="col-md-3">

                  <div className="card bg-light border-0 text-center h-100">

                    <div className="card-body">

                      <h2 className="fw-bold text-primary">
                        {attendanceMarkedCount}
                      </h2>

                      <span className="text-muted">
                        Attendance Marked
                      </span>

                    </div>

                  </div>

                </div>

              </div>

              {/* RESULTS TABLE */}
              <div className="table-responsive">

                <table className="table table-hover align-middle">

                  <thead className="table-dark">

                    <tr>
                      <th>Face</th>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Recognition</th>
                      <th>Similarity</th>
                      <th>Attendance</th>
                      <th>Action</th>
                    </tr>

                  </thead>

                  <tbody>

                    {students.map(
                      (student, index) => {

                        const recognized =
                          student?.recognized ===
                          true;

                        const manuallyMarked =
                          student?.manually_marked ===
                          true;

                        const faceNumber =
                          student?.face_number ??
                          index + 1;

                        return (
                          <tr
                            key={
                              student?.user?.id ||
                              `face-${faceNumber}`
                            }
                          >

                            <td>
                              {faceNumber}
                            </td>

                            <td className="fw-semibold">

                              {recognized &&
                              student?.user ? (
                                <div>
                                  <div>
                                    {
                                      student.user
                                        .full_name
                                    }
                                  </div>

                                  <small className="text-muted">
                                    User ID:{" "}
                                    {
                                      student.user
                                        .id
                                    }
                                  </small>
                                </div>
                              ) : (
                                "Unknown Student"
                              )}

                            </td>

                            <td>
                              {student?.user
                                ?.email ||
                                "-"}
                            </td>

                            <td>

                              {recognized ? (
                                <span className="badge bg-success">
                                  Recognized
                                </span>
                              ) : (
                                <span className="badge bg-warning text-dark">
                                  Unknown
                                </span>
                              )}

                            </td>

                            <td>
                              {student?.similarity !==
                                undefined &&
                              student?.similarity !==
                                null
                                ? Number(
                                    student.similarity
                                  ).toFixed(4)
                                : "-"}
                            </td>

                            <td>

                              {manuallyMarked ? (
                                <span className="badge bg-primary">
                                  Manual Present
                                </span>
                              ) : student
                                  ?.attendance
                                  ?.success ? (
                                <span className="badge bg-success">
                                  PRESENT
                                </span>
                              ) : recognized ? (
                                <span className="badge bg-warning text-dark">
                                  Already Marked
                                </span>
                              ) : (
                                <span className="badge bg-secondary">
                                  REVIEW
                                </span>
                              )}

                            </td>

                            <td>

                              {!recognized &&
                              !manuallyMarked ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() =>
                                    markPresent(
                                      faceNumber
                                    )
                                  }
                                >
                                  Mark Present
                                </button>
                              ) : recognized ? (
                                <span className="text-success">
                                  AI Processed
                                </span>
                              ) : (
                                <span className="text-primary">
                                  Manually Marked
                                </span>
                              )}

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </div>

        )}

      </main>

    </div>
  );
}

export default ClassroomAttendance;