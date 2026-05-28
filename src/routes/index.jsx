import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedLayout from "../components/layout/ProtectedLayout";
import ActasPage from "../pages/ActasPage";
import AjustesStockPage from "../pages/AjustesStockPage";
import AlumnosPage from "../pages/AlumnosPage";
import DashboardPage from "../pages/DashboardPage";
import DiscrepanciasPage from "../pages/DiscrepanciasPage";
import DistribucionesPage from "../pages/DistribucionesPage";
import EtiquetasPage from "../pages/EtiquetasPage";
import IngresosPage from "../pages/IngresosPage";
import LoginPage from "../pages/LoginPage";
import MovimientosPage from "../pages/MovimientosPage";
import PlanesDistribucionPage from "../pages/PlanesDistribucionPage";
import PortalPadrePage from "../pages/PortalPadrePage";
import { ProveedoresPage } from "../pages/ProveedoresPage";
import QRScannerPage from "../pages/QRScannerPage";
import ReportesPage from "../pages/ReportesPage";
import StockPage from "../pages/StockPage";
import UsuariosPage from "../pages/UsuariosPage";
import VehiculosPage from "../pages/VehiculosPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "proveedores", element: <ProveedoresPage /> },
      { path: "stock", element: <StockPage /> },
      { path: "ingresos", element: <IngresosPage /> },
      { path: "alumnos", element: <AlumnosPage /> },
      { path: "qr-scanner", element: <QRScannerPage /> },
      { path: "distribuciones", element: <DistribucionesPage /> },
      { path: "movimientos", element: <MovimientosPage /> },
      { path: "usuarios", element: <UsuariosPage /> },
      { path: "reportes", element: <ReportesPage /> },
      { path: "vehiculos", element: <VehiculosPage /> },
      { path: "actas", element: <ActasPage /> },
      { path: "discrepancias", element: <DiscrepanciasPage /> },
      { path: "etiquetas", element: <EtiquetasPage /> },
      { path: "portal-padre", element: <PortalPadrePage /> },
      { path: "planes-distribucion", element: <PlanesDistribucionPage /> },
      { path: "ajustes-stock", element: <AjustesStockPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
