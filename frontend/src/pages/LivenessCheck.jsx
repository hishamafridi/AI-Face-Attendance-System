
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function LivenessCheck() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [step, setStep] = useState("idle");

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const startCamera = async () => {
    setError("");
    setResult(null);
    setStep("idle");

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
    setStep("idle");
  };

  const captureFrame = () => {
    const video = videoRef.current;

    if (!video) {
      return null;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return null;
    }

    const canvas =
      document.createElement("canvas");

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

  const canvasToBlob = (canvas) => {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.9
      );
    });
  };

  const checkLiveness = async () => {
    setError("");
    setResult(null);
    setChecking(true);

    try {
      /*
       * STEP 1
       * Capture the first frame.
       */

      setStep("first");

      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      );

      const firstCanvas = captureFrame();

      if (!firstCanvas) {
        throw new Error(
          "Could not capture the first frame. Please make sure your face is visible."
        );
      }

      const firstBlob =
        await canvasToBlob(firstCanvas);

      if (!firstBlob) {
        throw new Error(
          "Could not create the first image."
        );
      }

      /*
       * STEP 2
       * Ask the user to move slightly.
       */

      setStep("move");

      await new Promise((resolve) =>
        setTimeout(resolve, 1800)
      );

      /*
       * STEP 3
       * Capture the second frame.
       */

      setStep("second");

      const secondCanvas = captureFrame();

      if (!secondCanvas) {
        throw new Error(
          "Could not capture the second frame."
        );
      }

      const secondBlob =
        await canvasToBlob(secondCanvas);

      if (!secondBlob) {
        throw new Error(
          "Could not create the second image."
        );
      }

      /*
       * STEP 4
       * Send both images to FastAPI.
       */

      setStep("checking");

      const formData = new FormData();

      formData.append(
        "previous_frame",
        firstBlob,
        "previous-frame.jpg"
      );

      formData.append(
        "current_frame",
        secondBlob,
        "current-frame.jpg"
      );

      console.log(
        "Sending liveness frames:",
        firstBlob.size,
        secondBlob.size
      );

      const response = await api.post(
        "/liveness/check",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log(
        "Liveness response:",
        response.data
      );

      setResult(response.data);
      setStep("complete");

    } catch (err) {
      console.error(
        "Liveness check error:",
        err
      );

      if (err.response?.data?.detail) {
        setError(
          typeof err.response.data.detail ===
            "string"
            ? err.response.data.detail
            : JSON.stringify(
                err.response.data.detail
              )
        );
      } else if (err.message) {
        setError(err.message);
      } else {
        setError(
          "Liveness check failed. Please try again."
        );
      }

      setStep("idle");

    } finally {
      setChecking(false);
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
                Liveness Detection
              </h1>

              <p className="text-muted">
                Verify that a real person is in front
                of the camera.
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
                      Liveness Error
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
                        className="w-100"
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

                      {/* Status */}
                      <div
                        className="position-absolute bottom-0 start-0 end-0 text-center text-white p-3"
                        style={{
                          background:
                            "linear-gradient(transparent, rgba(0,0,0,0.85))",
                        }}
                      >

                        {step === "first" && (
                          <strong>
                            Capturing first frame...
                          </strong>
                        )}

                        {step === "move" && (
                          <strong>
                            👋 Please move your head
                            slightly...
                          </strong>
                        )}

                        {step === "second" && (
                          <strong>
                            Capturing second frame...
                          </strong>
                        )}

                        {step === "checking" && (
                          <strong>
                            🔄 Analyzing facial movement...
                          </strong>
                        )}

                        {step === "complete" && (
                          <strong>
                            Liveness check complete
                          </strong>
                        )}

                        {step === "idle" && (
                          <strong>
                            Position your face inside
                            the guide
                          </strong>
                        )}

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
                          🛡️
                        </div>

                        <h4>
                          Liveness Verification
                        </h4>

                        <p className="text-light mb-0">
                          Start the camera to verify
                          that you are a real person.
                        </p>

                      </div>

                    </div>

                  )}

                </div>

                {/* How it works */}
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
                        First Frame
                      </h6>

                      <small className="text-muted">
                        The system captures your
                        initial face position.
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
                        Small Movement
                      </h6>

                      <small className="text-muted">
                        Move your head slightly when
                        instructed.
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
                        Verification
                      </h6>

                      <small className="text-muted">
                        AI analyzes facial landmark
                        movement.
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
                      🛡️ Start Liveness Check
                    </button>

                  ) : (

                    <>

                      <button
                        type="button"
                        className="btn btn-success btn-lg px-4"
                        onClick={checkLiveness}
                        disabled={checking}
                      >
                        {checking
                          ? "🔄 Checking..."
                          : "Start Verification"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-danger btn-lg px-4"
                        onClick={stopCamera}
                        disabled={checking}
                      >
                        Stop Camera
                      </button>

                    </>

                  )}

                </div>

                {/* Result */}
                {result && (
                  <div className="mt-4">

                    {result.live ? (

                      <div className="card border-success">

                        <div className="card-body text-center">

                          <div
                            className="text-success"
                            style={{
                              fontSize: "55px",
                            }}
                          >
                            ✓
                          </div>

                          <h3 className="text-success fw-bold">
                            Live Person Detected
                          </h3>

                          <p className="text-muted">
                            The facial movement passed
                            the liveness check.
                          </p>

                          <hr />

                          <div className="row">

                            <div className="col-md-6">

                              <small className="text-muted">
                                Movement
                              </small>

                              <div className="fw-bold">
                                {result.movement}
                              </div>

                            </div>

                            <div className="col-md-6">

                              <small className="text-muted">
                                Threshold
                              </small>

                              <div className="fw-bold">
                                {result.threshold}
                              </div>

                            </div>

                          </div>

                          <div className="mt-3">

                            <span className="badge bg-success fs-6">
                              {result.message}
                            </span>

                          </div>

                        </div>

                      </div>

                    ) : (

                      <div className="card border-warning">

                        <div className="card-body text-center">

                          <div
                            className="text-warning"
                            style={{
                              fontSize: "55px",
                            }}
                          >
                            !
                          </div>

                          <h3 className="text-warning fw-bold">
                            Liveness Not Confirmed
                          </h3>

                          <p className="text-muted">
                            {result.message}
                          </p>

                          <hr />

                          <div className="row">

                            <div className="col-md-6">

                              <small className="text-muted">
                                Movement
                              </small>

                              <div className="fw-bold">
                                {result.movement}
                              </div>

                            </div>

                            <div className="col-md-6">

                              <small className="text-muted">
                                Threshold
                              </small>

                              <div className="fw-bold">
                                {result.threshold}
                              </div>

                            </div>

                          </div>

                        </div>

                      </div>

                    )}

                  </div>
                )}

              </div>

            </div>

            <div className="text-center text-muted mt-3">

              <small>
                🔒 Liveness detection uses facial
                landmark movement to help distinguish
                a live person from a static image.
              </small>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default LivenessCheck;
