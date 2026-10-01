import React, { useEffect, useRef, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

const FaceEnrollment = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [step, setStep] = useState("straight");

  const [capturedFrames, setCapturedFrames] = useState({
    straight: null,
    left: null,
    right: null,
  });

  // Student information
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [className, setClassName] = useState("");
  const [phone, setPhone] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  // ============================================================
  // START CAMERA
  // ============================================================

  const startCamera = async () => {
    setError("");
    setMessage("");
    setCompleted(false);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Your browser does not support camera access."
        );
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });

        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      console.log("Camera stream:", stream);

      const videoTrack = stream.getVideoTracks()[0];

      if (!videoTrack) {
        throw new Error("No camera video track was found.");
      }

      console.log(
        "Camera settings:",
        videoTrack.getSettings()
      );

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error(
          "Camera video element is not available."
        );
      }

      const video = videoRef.current;

      video.srcObject = stream;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;

      video.style.display = "block";
      video.style.visibility = "visible";
      video.style.opacity = "1";

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

      console.log(
        "Video metadata:",
        video.videoWidth,
        video.videoHeight
      );

      await video.play();

      console.log(
        "Video playing:",
        !video.paused
      );

      if (
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        throw new Error(
          "Camera started but no video frames are being received."
        );
      }

      setCameraStarted(true);
      setStep("straight");

      setCapturedFrames({
        straight: null,
        left: null,
        right: null,
      });

      setMessage(
        "Step 1: Look straight at the camera."
      );
    } catch (err) {
      console.error("Camera error:", err);

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }

      setCameraStarted(false);

      setError(
        err.message ||
          "Unable to access the camera. Please allow camera permission."
      );
    }
  };

  // ============================================================
  // STOP CAMERA
  // ============================================================

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
  };

  // ============================================================
  // CAPTURE FRAME
  // ============================================================

  const captureFrame = () => {
    setError("");

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video) {
      setError("Camera video is not available.");
      return;
    }

    if (!canvas) {
      setError("Canvas is not available.");
      return;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setError(
        "Camera is not ready yet. Please wait a moment."
      );
      return;
    }

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Unable to create canvas context."
        );
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const imageData = canvas.toDataURL(
        "image/jpeg",
        0.9
      );

      if (!imageData) {
        throw new Error(
          "Could not capture camera image."
        );
      }

      setCapturedFrames((previous) => ({
        ...previous,
        [step]: imageData,
      }));

      if (step === "straight") {
        setStep("left");

        setMessage(
          "Step 2: Slowly turn your face to the left."
        );
      } else if (step === "left") {
        setStep("right");

        setMessage(
          "Step 3: Slowly turn your face to the right."
        );
      } else if (step === "right") {
        setCompleted(true);

        setMessage(
          "All face images captured successfully."
        );
      }
    } catch (err) {
      console.error("Capture error:", err);

      setError(
        err.message ||
          "Unable to capture image."
      );
    }
  };

  // ============================================================
  // BASE64 -> FILE
  // ============================================================

  const convertBase64ToFile = (
    base64,
    filename
  ) => {
    const parts = base64.split(",");

    const mime =
      parts[0]?.match(/:(.*?);/)?.[1] ||
      "image/jpeg";

    const binaryString = atob(parts[1]);

    const bytes = new Uint8Array(
      binaryString.length
    );

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] =
        binaryString.charCodeAt(i);
    }

    return new File(
      [bytes],
      filename,
      {
        type: mime,
      }
    );
  };

  // ============================================================
  // BACKEND ERROR
  // ============================================================

  const getBackendError = (data) => {
    if (!data) {
      return "Student enrollment failed.";
    }

    if (typeof data === "string") {
      return data;
    }

    if (data.detail) {
      if (typeof data.detail === "string") {
        return data.detail;
      }

      if (Array.isArray(data.detail)) {
        return data.detail
          .map((item) => {
            if (typeof item === "string") {
              return item;
            }

            if (item?.msg) {
              const location = item?.loc
                ? ` [${item.loc.join(" → ")}]`
                : "";

              return `${item.msg}${location}`;
            }

            return JSON.stringify(item);
          })
          .join("\n");
      }

      return JSON.stringify(
        data.detail,
        null,
        2
      );
    }

    if (data.message) {
      if (typeof data.message === "string") {
        return data.message;
      }

      return JSON.stringify(
        data.message,
        null,
        2
      );
    }

    if (data.error) {
      if (typeof data.error === "string") {
        return data.error;
      }

      return JSON.stringify(
        data.error,
        null,
        2
      );
    }

    return JSON.stringify(
      data,
      null,
      2
    );
  };

  // ============================================================
  // ENROLL STUDENT
  // ============================================================

  const enrollStudent = async () => {
    setError("");
    setMessage("");

    // ----------------------------------------------------------
    // Validate student information
    // ----------------------------------------------------------

    if (!fullName.trim()) {
      setError(
        "Please enter the student's full name."
      );
      return;
    }

    if (!studentId.trim()) {
      setError(
        "Please enter the student's ID."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Please enter the student's email."
      );
      return;
    }

    if (!department.trim()) {
      setError(
        "Please enter the student's department."
      );
      return;
    }

    if (!className.trim()) {
      setError(
        "Please enter the student's class."
      );
      return;
    }

    if (
      !capturedFrames.straight ||
      !capturedFrames.left ||
      !capturedFrames.right
    ) {
      setError(
        "Please capture all three face images first."
      );
      return;
    }

    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    if (!token) {
      setError(
        "You are not logged in. Please login again."
      );
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      // --------------------------------------------------------
      // Student information
      // --------------------------------------------------------

      formData.append(
        "full_name",
        fullName.trim()
      );

      formData.append(
        "student_id",
        studentId.trim()
      );

      formData.append(
        "email",
        email.trim()
      );

      formData.append(
        "department",
        department.trim()
      );

      formData.append(
        "class_name",
        className.trim()
      );

      // Phone is optional
      if (phone.trim()) {
        formData.append(
          "phone",
          phone.trim()
        );
      }

      // --------------------------------------------------------
      // Face images
      // --------------------------------------------------------

      formData.append(
        "straight_frame",
        convertBase64ToFile(
          capturedFrames.straight,
          "straight.jpg"
        )
      );

      formData.append(
        "left_frame",
        convertBase64ToFile(
          capturedFrames.left,
          "left.jpg"
        )
      );

      formData.append(
        "right_frame",
        convertBase64ToFile(
          capturedFrames.right,
          "right.jpg"
        )
      );

      console.log(
        "Sending student enrollment request..."
      );

      console.log(
        "Endpoint:",
        `${API_BASE_URL}/face/enroll-student`
      );

      const response = await fetch(
        `${API_BASE_URL}/face/enroll-student`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        }
      );

      console.log(
        "Enrollment HTTP status:",
        response.status
      );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      let data;

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      console.log(
        "Enrollment backend response:",
        data
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Not authenticated. Please login again."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to enroll students."
          );
        }

        if (response.status === 404) {
          throw new Error(
            "Student enrollment endpoint was not found."
          );
        }

        if (response.status === 409) {
          throw new Error(
            getBackendError(data)
          );
        }

        if (response.status === 422) {
          throw new Error(
            `Validation error:\n${getBackendError(data)}`
          );
        }

        throw new Error(
          getBackendError(data)
        );
      }

      setMessage(
        data?.message ||
          "Student enrolled successfully!"
      );

      // Clear student information
      setFullName("");
      setStudentId("");
      setEmail("");
      setDepartment("");
      setClassName("");
      setPhone("");

      // Clear captured images
      setCapturedFrames({
        straight: null,
        left: null,
        right: null,
      });

      setCompleted(false);
      setStep("straight");

      stopCamera();
    } catch (err) {
      console.error(
        "Enrollment error:",
        err
      );

      setError(
        err.message ||
          "Unable to enroll student."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CLEANUP CAMERA
  // ============================================================

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        streamRef.current = null;
      }
    };
  }, []);

  // ============================================================
  // STEP TEXT
  // ============================================================

  const getStepText = () => {
    if (step === "straight") {
      return "Look Straight";
    }

    if (step === "left") {
      return "Turn Left";
    }

    if (step === "right") {
      return "Turn Right";
    }

    return "";
  };

  // ============================================================
  // INPUT STYLE
  // ============================================================

  const inputStyle = {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    boxSizing: "border-box",
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "30px",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <h1>Face Enrollment</h1>

      <p
        style={{
          color: "#666",
          marginBottom: "25px",
        }}
      >
        Register a student's information and face
        for the attendance system.
      </p>

      {/* =====================================================
          STUDENT INFORMATION
          ===================================================== */}

      <div
        style={{
          display: "grid",
          gap: "15px",
          marginBottom: "25px",
        }}
      >
        <input
          type="text"
          placeholder="Student Full Name *"
          value={fullName}
          onChange={(event) =>
            setFullName(event.target.value)
          }
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Student ID *"
          value={studentId}
          onChange={(event) =>
            setStudentId(event.target.value)
          }
          style={inputStyle}
        />

        <input
          type="email"
          placeholder="Student Email *"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Department *"
          value={department}
          onChange={(event) =>
            setDepartment(event.target.value)
          }
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Class *"
          value={className}
          onChange={(event) =>
            setClassName(event.target.value)
          }
          style={inputStyle}
        />

        <input
          type="tel"
          placeholder="Phone Number (Optional)"
          value={phone}
          onChange={(event) =>
            setPhone(event.target.value)
          }
          style={inputStyle}
        />
      </div>

      {/* =====================================================
          CAMERA
          ===================================================== */}

      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          height: "480px",
          margin: "0 auto 20px",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#000",
          borderRadius: "10px",
          border: "2px solid #ddd",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
            backgroundColor: "#000",
            transform: "scaleX(-1)",
          }}
        />

        {!cameraStarted && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              backgroundColor:
                "rgba(0, 0, 0, 0.75)",
              textAlign: "center",
              padding: "20px",
            }}
          >
            Camera is not started
          </div>
        )}

        {cameraStarted && !completed && (
          <div
            style={{
              position: "absolute",
              top: "15px",
              left: "15px",
              right: "15px",
              padding: "12px",
              backgroundColor:
                "rgba(0, 0, 0, 0.65)",
              color: "#fff",
              borderRadius: "8px",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {getStepText()}
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        style={{
          display: "none",
        }}
      />

      {/* =====================================================
          CAMERA BUTTONS
          ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        {!cameraStarted ? (
          <button
            onClick={startCamera}
            style={{
              padding: "12px 25px",
              fontSize: "16px",
              cursor: "pointer",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "#007bff",
              color: "#fff",
            }}
          >
            Start Camera
          </button>
        ) : (
          <>
            {!completed && (
              <button
                onClick={captureFrame}
                style={{
                  padding: "12px 25px",
                  fontSize: "16px",
                  cursor: "pointer",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: "#28a745",
                  color: "#fff",
                }}
              >
                Capture {getStepText()}
              </button>
            )}

            <button
              onClick={stopCamera}
              style={{
                padding: "12px 25px",
                fontSize: "16px",
                cursor: "pointer",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#dc3545",
                color: "#fff",
              }}
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      {/* =====================================================
          CAPTURE STATUS
          ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            padding: "10px 15px",
            borderRadius: "6px",
            backgroundColor:
              capturedFrames.straight
                ? "#d4edda"
                : "#f1f1f1",
          }}
        >
          Straight:{" "}
          {capturedFrames.straight
            ? "✓ Captured"
            : "Not captured"}
        </div>

        <div
          style={{
            padding: "10px 15px",
            borderRadius: "6px",
            backgroundColor:
              capturedFrames.left
                ? "#d4edda"
                : "#f1f1f1",
          }}
        >
          Left:{" "}
          {capturedFrames.left
            ? "✓ Captured"
            : "Not captured"}
        </div>

        <div
          style={{
            padding: "10px 15px",
            borderRadius: "6px",
            backgroundColor:
              capturedFrames.right
                ? "#d4edda"
                : "#f1f1f1",
          }}
        >
          Right:{" "}
          {capturedFrames.right
            ? "✓ Captured"
            : "Not captured"}
        </div>
      </div>

      {/* =====================================================
          ENROLL BUTTON
          ===================================================== */}

      {completed &&
        capturedFrames.straight &&
        capturedFrames.left &&
        capturedFrames.right && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            <button
              onClick={enrollStudent}
              disabled={loading}
              style={{
                padding: "14px 30px",
                fontSize: "17px",
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
                border: "none",
                borderRadius: "6px",
                backgroundColor: loading
                  ? "#999"
                  : "#6f42c1",
                color: "#fff",
              }}
            >
              {loading
                ? "Enrolling..."
                : "Enroll Student"}
            </button>
          </div>
        )}

      {/* =====================================================
          SUCCESS MESSAGE
          ===================================================== */}

      {message && (
        <div
          style={{
            padding: "12px",
            marginTop: "15px",
            backgroundColor: "#d4edda",
            color: "#155724",
            borderRadius: "6px",
            textAlign: "center",
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </div>
      )}

      {/* =====================================================
          ERROR MESSAGE
          ===================================================== */}

      {error && (
        <div
          style={{
            padding: "12px",
            marginTop: "15px",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "6px",
            textAlign: "center",
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default FaceEnrollment;