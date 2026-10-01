
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function FaceRecognition() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [recognizing, setRecognizing] = useState(false);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const startCamera = async () => {
    setError("");
    setResult(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is not supported by this browser."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });

      streamRef.current = stream;

      setCameraStarted(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.play().catch((err) => {
            console.error("Video play error:", err);
          });
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);

      setError(
        err.message ||
          "Unable to access the camera. Please allow camera permission."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
  };

  const captureImage = () => {
    const video = videoRef.current;

    if (!video) {
      return null;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas;
  };

  const recognizeFace = async () => {
    setError("");
    setResult(null);
    setRecognizing(true);

    try {
      const canvas = captureImage();

      if (!canvas) {
        throw new Error(
          "Camera image is not ready. Please wait until your face appears."
        );
      }

      const blob = await new Promise((resolve) => {
        canvas.toBlob(
          (resultBlob) => resolve(resultBlob),
          "image/jpeg",
          0.9
        );
      });

      if (!blob) {
        throw new Error(
          "Could not create the camera image."
        );
      }

      const formData = new FormData();

      // IMPORTANT:
      // FastAPI expects UploadFile named "file"
      formData.append(
        "file",
        blob,
        "face-recognition.jpg"
      );

      console.log(
        "Sending face image:",
        blob.type,
        blob.size
      );

      const response = await api.post(
        "/face/recognize",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log(
        "Recognition response:",
        response.data
      );

      setResult(response.data);

    } catch (err) {
      console.error(
        "Face recognition error:",
        err
      );

      if (err.response?.data?.detail) {
        setError(
          typeof err.response.data.detail === "string"
            ? err.response.data.detail
            : JSON.stringify(
                err.response.data.detail
              )
        );
      } else if (err.message) {
        setError(err.message);
      } else {
        setError(
          "Face recognition failed. Please try again."
        );
      }
    } finally {
      setRecognizing(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light">

      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary shadow-sm">

        <div className="container">

          <span className="navbar-brand fw-bold">
            AI Face Attendance
          </span>

          <button
            type="button"
            className="btn btn-light"
            onClick={() => {
              stopCamera();
              navigate("/dashboard");
            }}
          >
            Back to Dashboard
          </button>

        </div>

      </nav>

      {/* Main */}
      <main className="container py-5">

        <div className="row justify-content-center">

          <div className="col-lg-8">

            {/* Header */}
            <div className="text-center mb-4">

              <h1 className="fw-bold">
                Face Recognition
              </h1>

              <p className="text-muted">
                Verify your identity using AI-based
                facial recognition.
              </p>

            </div>

            {/* Main Card */}
            <div className="card shadow border-0">

              <div className="card-body p-4 p-md-5">

                {/* Error */}
                {error && (
                  <div
                    className="alert alert-danger"
                    role="alert"
                  >
                    <strong>
                      Recognition Error
                    </strong>

                    <div className="mt-1">
                      {error}
                    </div>
                  </div>
                )}

                {/* Camera */}
                <div
                  className="position-relative bg-dark rounded-3 overflow-hidden"
                  style={{
                    minHeight: "420px",
                  }}
                >

                  {cameraStarted ? (

                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-100 h-100"
                        style={{
                          minHeight: "420px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />

                      {/* Face guide */}
                      <div
                        className="position-absolute top-50 start-50 translate-middle border border-3 border-light rounded-circle"
                        style={{
                          width: "230px",
                          height: "300px",
                          opacity: 0.75,
                          pointerEvents: "none",
                        }}
                      />

                      <div
                        className="position-absolute bottom-0 start-0 end-0 text-center text-white p-3"
                        style={{
                          background:
                            "linear-gradient(transparent, rgba(0,0,0,0.8))",
                        }}
                      >
                        Position your face inside
                        the guide
                      </div>
                    </>

                  ) : (

                    <div className="d-flex align-items-center justify-content-center text-center text-white p-5">
                      <div>

                        <div
                          className="mb-3"
                          style={{
                            fontSize: "60px",
                          }}
                        >
                          📷
                        </div>

                        <h4>
                          Camera Ready
                        </h4>

                        <p className="text-light mb-0">
                          Click "Start Camera" to begin
                          face recognition.
                        </p>

                      </div>
                    </div>

                  )}

                </div>

                {/* Instructions */}
                <div className="row mt-4 g-3">

                  <div className="col-md-4">

                    <div className="text-center p-3 border rounded-3 h-100">

                      <div
                        className="fw-bold mb-2"
                        style={{
                          fontSize: "24px",
                        }}
                      >
                        1
                      </div>

                      <h6>
                        Start Camera
                      </h6>

                      <small className="text-muted">
                        Allow camera access.
                      </small>

                    </div>

                  </div>

                  <div className="col-md-4">

                    <div className="text-center p-3 border rounded-3 h-100">

                      <div
                        className="fw-bold mb-2"
                        style={{
                          fontSize: "24px",
                        }}
                      >
                        2
                      </div>

                      <h6>
                        Position Face
                      </h6>

                      <small className="text-muted">
                        Look directly at the camera.
                      </small>

                    </div>

                  </div>

                  <div className="col-md-4">

                    <div className="text-center p-3 border rounded-3 h-100">

                      <div
                        className="fw-bold mb-2"
                        style={{
                          fontSize: "24px",
                        }}
                      >
                        3
                      </div>

                      <h6>
                        Recognize
                      </h6>

                      <small className="text-muted">
                        Capture and verify your face.
                      </small>

                    </div>

                  </div>

                </div>

                {/* Controls */}
                <div className="d-flex justify-content-center gap-3 mt-4">

                  {!cameraStarted ? (

                    <button
                      type="button"
                      className="btn btn-primary btn-lg px-5"
                      onClick={startCamera}
                    >
                      📷 Start Camera
                    </button>

                  ) : (

                    <>

                      <button
                        type="button"
                        className="btn btn-success btn-lg px-4"
                        onClick={recognizeFace}
                        disabled={recognizing}
                      >
                        {recognizing
                          ? "🔄 Recognizing..."
                          : "🔍 Capture & Recognize"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-danger btn-lg px-4"
                        onClick={stopCamera}
                        disabled={recognizing}
                      >
                        Stop Camera
                      </button>

                    </>

                  )}

                </div>

                {/* Recognition Result */}
                {result && (
                  <div className="mt-4">

                    {result.recognized ? (

                      <div className="card border-success">

                        <div className="card-body">

                          <div className="text-center mb-3">

                            <div
                              className="text-success"
                              style={{
                                fontSize: "50px",
                              }}
                            >
                              ✓
                            </div>

                            <h3 className="text-success fw-bold">
                              Face Recognized
                            </h3>

                            <p className="text-muted mb-0">
                              Identity successfully
                              verified.
                            </p>

                          </div>

                          <hr />

                          <div className="row">

                            <div className="col-md-6 mb-3">

                              <small className="text-muted">
                                Full Name
                              </small>

                              <div className="fw-bold">
                                {result.user?.full_name ||
                                  "N/A"}
                              </div>

                            </div>

                            <div className="col-md-6 mb-3">

                              <small className="text-muted">
                                Email
                              </small>

                              <div className="fw-bold">
                                {result.user?.email ||
                                  "N/A"}
                              </div>

                            </div>

                            <div className="col-md-6">

                              <small className="text-muted">
                                User ID
                              </small>

                              <div className="fw-bold">
                                {result.user?.id ||
                                  "N/A"}
                              </div>

                            </div>

                            <div className="col-md-6">

                              <small className="text-muted">
                                Similarity
                              </small>

                              <div className="fw-bold text-success">
                                {result.similarity ??
                                  "N/A"}
                              </div>

                            </div>

                          </div>

                        </div>

                      </div>

                    ) : (

                      <div className="alert alert-warning text-center">

                        <div
                          style={{
                            fontSize: "45px",
                          }}
                        >
                          !
                        </div>

                        <h4 className="fw-bold">
                          Face Not Recognized
                        </h4>

                        <p className="mb-2">
                          {result.message ||
                            "No matching face was found."}
                        </p>

                        {result.similarity !==
                          undefined && (
                          <small>
                            Similarity:{" "}
                            {result.similarity}
                          </small>
                        )}

                      </div>

                    )}

                  </div>
                )}

              </div>

            </div>

            {/* Security note */}
            <div className="text-center text-muted mt-3">

              <small>
                🔒 Your camera is used only to capture
                the image required for face recognition.
              </small>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default FaceRecognition;
