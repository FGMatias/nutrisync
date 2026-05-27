import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Camera,
  CheckCircle2,
  LoaderCircle,
  QrCode,
  Upload,
  XCircle,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import * as pdfjsLib from "pdfjs-dist/webpack.mjs";
import { useAuth } from "../hooks/queries/useAuth";
import { useAlumnos } from "../hooks/queries/useAlumnos";
import {
  useRegisterDistribucionQr,
  useSyncPendingDistribuciones,
} from "../hooks/queries/useDistribuciones";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";

const READER_ID = "nutrisync-qr-reader";
const SUPPORTED_BARCODES = ["qr_code"];

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "QR";
}

function getScanErrorMessage(error) {
  const message = String(error?.message ?? error ?? "");

  if (
    message.toLowerCase().includes("notfoundexception") ||
    message.toLowerCase().includes("no multi format readers")
  ) {
    return "No se detecto un QR valido en el archivo. Intente de nuevo.";
  }

  if (message.toLowerCase().includes("permission")) {
    return "No se pudo acceder a la camara. Revise los permisos del navegador.";
  }

  return message || "No se pudo procesar el QR. Intente de nuevo.";
}

function isVirtualCamera(camera) {
  const label = String(camera?.label ?? "").toLowerCase();

  return (
    label.includes("obs") ||
    label.includes("virtual") ||
    label.includes("snap camera") ||
    label.includes("manycam") ||
    label.includes("broadcast")
  );
}

function getRankedCameras(cameras) {
  if (!Array.isArray(cameras) || cameras.length === 0) {
    return [];
  }

  const scoreCamera = (camera) => {
    const label = String(camera?.label ?? "").toLowerCase();
    let value = 0;

    if (isVirtualCamera(camera)) {
      value -= 1000;
    }

    if (
      label.includes("back") ||
      label.includes("rear") ||
      label.includes("environment")
    ) {
      value += 30;
    }

    if (
      label.includes("integrated") ||
      label.includes("usb") ||
      label.includes("webcam") ||
      label.includes("camera") ||
      label.includes("hd")
    ) {
      value += 15;
    }

    return value;
  };

  const physical = cameras.filter((camera) => !isVirtualCamera(camera));
  const source = physical.length > 0 ? physical : cameras;

  return [...source].sort((left, right) => {
    return scoreCamera(right) - scoreCamera(left);
  });
}

async function convertPdfToImageFile(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  if (!context) {
    throw new Error("No se pudo preparar la lectura del PDF.");
  }

  await page.render({ canvasContext: context, viewport }).promise;

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) {
        resolve(value);
        return;
      }

      reject(new Error("No se pudo convertir el PDF a imagen."));
    }, "image/png");
  });

  return new File([blob], `${file.name.replace(/\.pdf$/i, "") || "qr"}.png`, {
    type: "image/png",
  });
}

function applyScannerViewportStyles() {
  const readerNode = document.getElementById(READER_ID);
  if (!readerNode) {
    return;
  }

  const video = readerNode.querySelector("video");
  if (video) {
    Object.assign(video.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      borderRadius: "14px",
    });
    video.setAttribute("playsinline", "true");
    video.muted = true;
  }

  const shadedRegion = readerNode.querySelector("#qr-shaded-region");
  if (shadedRegion) {
    shadedRegion.style.display = "none";
  }

  const scannerRegion = readerNode.querySelector("#qr-scanner-region");
  if (scannerRegion) {
    Object.assign(scannerRegion.style, {
      border: "none",
      background: "transparent",
      width: "100%",
      height: "100%",
    });
  }

  const canvas = readerNode.querySelector("canvas");
  if (canvas) {
    Object.assign(canvas.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    });
  }
}

function canUseBarcodeDetector() {
  return (
    typeof window !== "undefined" &&
    "BarcodeDetector" in window &&
    typeof window.BarcodeDetector === "function"
  );
}

export default function QRScannerPage() {
  const { perfil } = useAuth();
  useAlumnos();
  const { mutateAsync: registerDistribucionQr, isPending } =
    useRegisterDistribucionQr();
  const { mutate: syncPendingDistribuciones } = useSyncPendingDistribuciones();

  const hoy = format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es });
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [scanResult, setScanResult] = useState(null);

  const qrReaderRef = useRef(null);
  const fileInputRef = useRef(null);
  const handlingScanRef = useRef(false);
  const cameraActiveRef = useRef(false);
  const barcodeDetectorRef = useRef(null);
  const barcodeDetectorTimerRef = useRef(null);
  const cameraVisibilityTimerRef = useRef(null);

  const onlineBadge = useMemo(
    () =>
      isOnline
        ? {
            label: "En linea",
            style: {
              background: "var(--success-bg)",
              color: "var(--success)",
            },
          }
        : {
            label: "Offline",
            style: {
              background: "var(--danger-bg)",
              color: "var(--danger)",
            },
          },
    [isOnline],
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingDistribuciones();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) {
      syncPendingDistribuciones();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingDistribuciones]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    loadAvailableCameras().catch(() => {
      // Ignore initial camera listing errors until user starts scanning.
    });
  }, []);

  async function ensureReader() {
    if (!qrReaderRef.current) {
      qrReaderRef.current = new Html5Qrcode(READER_ID);
    }
    return qrReaderRef.current;
  }

  async function requestCameraPermission() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  async function loadAvailableCameras(requestPermission = false) {
    if (requestPermission) {
      try {
        await requestCameraPermission();
      } catch {
        // Let the scanner start path surface the final error.
      }
    }

    const cameras = await Html5Qrcode.getCameras();
    const ranked = getRankedCameras(cameras);
    setAvailableCameras(ranked);

    if (!selectedCameraId && ranked[0]?.id) {
      setSelectedCameraId(ranked[0].id);
    }

    return ranked;
  }

  async function stopCamera() {
    if (barcodeDetectorTimerRef.current) {
      window.clearInterval(barcodeDetectorTimerRef.current);
      barcodeDetectorTimerRef.current = null;
    }

    if (cameraVisibilityTimerRef.current) {
      window.clearInterval(cameraVisibilityTimerRef.current);
      cameraVisibilityTimerRef.current = null;
    }

    if (!qrReaderRef.current || !cameraActiveRef.current) {
      setCameraVisible(false);
      return;
    }

    try {
      await qrReaderRef.current.stop();
      await qrReaderRef.current.clear();
    } catch {
      // Ignored on cleanup.
    } finally {
      cameraActiveRef.current = false;
      setCameraActive(false);
      setCameraLoading(false);
      setCameraVisible(false);

      const readerNode = document.getElementById(READER_ID);
      if (readerNode) {
        readerNode.replaceChildren();
      }
    }
  }

  async function startBarcodeDetectorLoop() {
    if (!canUseBarcodeDetector()) {
      return;
    }

    if (!barcodeDetectorRef.current) {
      barcodeDetectorRef.current = new window.BarcodeDetector({
        formats: SUPPORTED_BARCODES,
      });
    }

    if (barcodeDetectorTimerRef.current) {
      window.clearInterval(barcodeDetectorTimerRef.current);
    }

    barcodeDetectorTimerRef.current = window.setInterval(async () => {
      if (handlingScanRef.current || !cameraActiveRef.current) {
        return;
      }

      const readerNode = document.getElementById(READER_ID);
      const video = readerNode?.querySelector("video");

      if (!video || video.readyState < 2) {
        return;
      }

      try {
        const barcodes = await barcodeDetectorRef.current.detect(video);
        const firstQr = barcodes?.find(
          (item) => typeof item.rawValue === "string" && item.rawValue.length > 0,
        );

        if (firstQr?.rawValue) {
          await handleDecodedText(firstQr.rawValue);
        }
      } catch {
        // Ignore detector noise and let html5-qrcode continue.
      }
    }, 250);
  }

  function watchCameraVisibility() {
    if (cameraVisibilityTimerRef.current) {
      window.clearInterval(cameraVisibilityTimerRef.current);
    }

    cameraVisibilityTimerRef.current = window.setInterval(() => {
      const readerNode = document.getElementById(READER_ID);
      const video = readerNode?.querySelector("video");
      const isVisible =
        Boolean(video) &&
        (video.readyState >= 2 ||
          (video.videoWidth ?? 0) > 0 ||
          (video.clientHeight ?? 0) > 0);

      setCameraVisible(isVisible);
    }, 120);
  }

  async function handleDecodedText(decodedText) {
    if (handlingScanRef.current) {
      return;
    }

    handlingScanRef.current = true;
    await stopCamera();

    try {
      const result = await registerDistribucionQr(decodedText);
      const distribucion = result.distribucion;
      const alumnoNombre = [
        distribucion.nombre,
        distribucion.apellido,
      ]
        .filter(Boolean)
        .join(" ");

      setScanResult({
        type: "success",
        title: "Escaneo registrado",
        message: result.message,
        alumno: alumnoNombre,
        gradoSeccion: `${distribucion.grado} grado | Seccion ${distribucion.seccion}`,
        hora: `${distribucion.hora} | ${result.status === "offline" ? "Offline" : "En linea"}`,
      });
    } catch (error) {
      setScanResult({
        type: "error",
        title: "QR denegado",
        message: getScanErrorMessage(error),
      });
    } finally {
      handlingScanRef.current = false;
    }
  }

  function getScannerConfig() {
    return {
      fps: 18,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const size = Math.floor(
          Math.min(viewfinderWidth, viewfinderHeight) * 0.72,
        );

        return {
          width: size,
          height: size,
        };
      },
      disableFlip: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
      videoConstraints: {
        width: { ideal: 1280 },
        height: { ideal: 1280 },
      },
    };
  }

  async function startReaderWithCamera(reader, cameraConfig) {
    await reader.start(
      cameraConfig,
      getScannerConfig(),
      (decodedText) => {
        handleDecodedText(decodedText);
      },
      () => {},
    );
  }

  async function startReaderWithPreferredDevice(reader, cameras) {
    const preferredId =
      selectedCameraId && cameras.some((camera) => camera.id === selectedCameraId)
        ? selectedCameraId
        : cameras[0]?.id;

    const orderedIds = [
      preferredId,
      ...cameras.map((camera) => camera.id).filter((id) => id && id !== preferredId),
    ].filter(Boolean);

    let lastError = null;

    for (const cameraId of orderedIds) {
      try {
        await startReaderWithCamera(reader, cameraId);
        if (cameraId !== selectedCameraId) {
          setSelectedCameraId(cameraId);
        }
        return;
      } catch (error) {
        lastError = error;
        try {
          await reader.clear();
        } catch {
          // Ignore cleanup while trying the next device.
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error("No se encontro una camara disponible.");
  }

  async function startCamera() {
    if (cameraLoading) {
      return;
    }

    if (cameraActive) {
      await stopCamera();
      return;
    }

    setScanResult(null);
    setCameraLoading(true);
    setCameraVisible(false);

    try {
      const reader = await ensureReader();
      const cameras = await loadAvailableCameras(true);

      if (cameras.length > 0) {
        await startReaderWithPreferredDevice(reader, cameras);
      } else {
        await startReaderWithCamera(reader, { facingMode: "environment" });
      }

      requestAnimationFrame(() => {
        applyScannerViewportStyles();
      });
      setCameraActive(true);
      cameraActiveRef.current = true;
      watchCameraVisibility();
      startBarcodeDetectorLoop();
    } catch (error) {
      setScanResult({
        type: "error",
        title: "No se pudo iniciar la camara",
        message: getScanErrorMessage(error),
      });
      cameraActiveRef.current = false;
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setScanResult(null);

    try {
      await stopCamera();
      const reader = await ensureReader();
      const scanableFile =
        file.type === "application/pdf" ? await convertPdfToImageFile(file) : file;
      const decodedText = await reader.scanFile(scanableFile, true);
      await reader.clear();
      await handleDecodedText(decodedText);
    } catch (error) {
      setScanResult({
        type: "error",
        title: "QR denegado",
        message: getScanErrorMessage(error),
      });
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Escaneo QR</h1>
          <p style={{ fontSize: 13, color: "var(--muted-fg)", margin: "2px 0 0" }}>
            {hoy}
          </p>
        </div>
        <Badge
          style={{
            ...onlineBadge.style,
            border: "none",
            padding: "6px 12px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "currentColor",
              marginRight: 6,
            }}
          />
          {onlineBadge.label}
        </Badge>
      </div>

      <Card>
        <CardHeader style={{ gap: 14 }}>
          <CardTitle style={{ fontSize: 14 }}>Escaner de QR del alumno</CardTitle>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            {availableCameras.length > 1 && (
              <div style={{ minWidth: 220 }}>
                <Label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
                  Camara
                </Label>
                <select
                  value={selectedCameraId}
                  onChange={(event) => setSelectedCameraId(event.target.value)}
                  disabled={cameraLoading || cameraActive}
                  style={{
                    width: "100%",
                    height: 40,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    padding: "0 12px",
                    fontSize: 13,
                  }}
                >
                  {availableCameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label || `Camara ${camera.id.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button
              onClick={startCamera}
              disabled={cameraLoading || isPending}
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              {cameraLoading ? (
                <LoaderCircle size={16} style={{ marginRight: 6 }} />
              ) : (
                <Camera size={16} style={{ marginRight: 6 }} />
              )}
              {cameraActive ? "Detener camara" : "Escanear por camara"}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={cameraLoading || isPending}
            >
              <Upload size={16} style={{ marginRight: 6 }} />
              Subir archivo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>
        </CardHeader>

        <CardContent
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            paddingTop: 4,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              minHeight: 360,
              background: "#1a1a2e",
              borderRadius: 14,
              position: "relative",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              id={READER_ID}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                zIndex: 1,
              }}
            />

            {!cameraVisible && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.7)" }}>
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: 10,
                    }}
                  >
                    <QrCode size={64} color="rgba(255,255,255,0.45)" />
                  </div>
                  <p style={{ fontSize: 13, margin: "10px 0 4px" }}>
                    {cameraLoading ? "Iniciando camara..." : "Listo para escanear"}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                      margin: 0,
                    }}
                  >
                    Usa la camara o sube una imagen del QR
                  </p>
                </div>
              </div>
            )}

            {[
              {
                top: 22,
                left: 22,
                borderTop: "3px solid hsl(174,72%,50%)",
                borderLeft: "3px solid hsl(174,72%,50%)",
              },
              {
                top: 22,
                right: 22,
                borderTop: "3px solid hsl(174,72%,50%)",
                borderRight: "3px solid hsl(174,72%,50%)",
              },
              {
                bottom: 22,
                left: 22,
                borderBottom: "3px solid hsl(174,72%,50%)",
                borderLeft: "3px solid hsl(174,72%,50%)",
              },
              {
                bottom: 22,
                right: 22,
                borderBottom: "3px solid hsl(174,72%,50%)",
                borderRight: "3px solid hsl(174,72%,50%)",
              },
            ].map((style, index) => (
              <div
                key={index}
                style={{
                  position: "absolute",
                  width: 26,
                  height: 26,
                  borderRadius: 2,
                  pointerEvents: "none",
                  ...style,
                }}
              />
            ))}
          </div>

          <p
            style={{
              width: "100%",
              maxWidth: 560,
              fontSize: 12,
              color: "var(--muted-fg)",
              textAlign: "center",
              margin: 0,
            }}
          >
            Solo se aceptan los QR creados desde la seccion de Alumnos. Si el
            codigo no corresponde a un alumno activo, sera denegado.
          </p>

          {(scanResult || isPending) && (
            <div
              style={{
                width: "100%",
                background:
                  scanResult?.type === "error"
                    ? "var(--danger-bg)"
                    : "var(--success-bg)",
                border:
                  scanResult?.type === "error"
                    ? "1px solid rgba(239, 68, 68, 0.2)"
                    : "1px solid rgba(34, 197, 94, 0.22)",
                borderRadius: 12,
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              {isPending ? (
                <LoaderCircle
                  size={32}
                  style={{ color: "var(--primary)", flexShrink: 0 }}
                />
              ) : scanResult?.type === "error" ? (
                <XCircle
                  size={32}
                  style={{ color: "var(--danger)", flexShrink: 0 }}
                />
              ) : (
                <CheckCircle2
                  size={32}
                  style={{ color: "var(--success)", flexShrink: 0 }}
                />
              )}

              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontWeight: 700,
                    margin: "0 0 4px",
                    color:
                      scanResult?.type === "error"
                        ? "var(--danger)"
                        : "var(--success)",
                  }}
                >
                  {isPending ? "Procesando QR..." : scanResult?.title}
                </p>

                {!isPending && scanResult?.type === "success" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--primary)",
                        color: "var(--primary-fg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {getInitials(scanResult.alumno)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, margin: 0, fontSize: 14 }}>
                        {scanResult.alumno}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--muted-fg)",
                          margin: 0,
                        }}
                      >
                        {scanResult.gradoSeccion}
                      </p>
                    </div>
                  </div>
                )}

                <p
                  style={{
                    fontSize: 12,
                    color: "var(--muted-fg)",
                    margin: scanResult?.type === "success" ? "8px 0 0" : 0,
                  }}
                >
                  {isPending
                    ? "Validando que el QR pertenezca a un alumno registrado..."
                    : scanResult?.type === "success"
                      ? `${scanResult.hora} | ${scanResult.message}`
                      : `${scanResult?.message} Intente de nuevo.`}
                </p>
              </div>
            </div>
          )}

          <p style={{ fontSize: 12, color: "var(--muted-fg)", margin: 0 }}>
            Registrando como:{" "}
            <strong>{perfil?.nombre_completo ?? "Usuario"}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
