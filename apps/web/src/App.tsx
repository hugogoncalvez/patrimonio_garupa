import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute, RutaContable } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BienesPage } from "./pages/BienesPage";
import { BienFormPage } from "./pages/BienFormPage";
import { BienDetailPage } from "./pages/BienDetailPage";
import { ConsumiblesPage } from "./pages/ConsumiblesPage";
import { ConsumibleDetailPage } from "./pages/ConsumibleDetailPage";
import { EntregasPage } from "./pages/EntregasPage";
import { EntregaFormPage } from "./pages/EntregaFormPage";
import { EntregaDetailPage } from "./pages/EntregaDetailPage";
import { ComprasPage } from "./pages/ComprasPage";
import { CompraFormPage } from "./pages/CompraFormPage";
import { CompraDetailPage } from "./pages/CompraDetailPage";
import { CatalogosPage } from "./pages/CatalogosPage";
import { UsuariosPage } from "./pages/UsuariosPage";
import { AuditoriaPage } from "./pages/AuditoriaPage";
import { ReportesPage } from "./pages/ReportesPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="/bienes" element={<BienesPage />} />
        <Route path="/bienes/nuevo" element={<BienFormPage />} />
        <Route path="/bienes/:id" element={<BienDetailPage />} />
        <Route path="/bienes/:id/editar" element={<BienFormPage />} />
        <Route path="/consumibles" element={<ConsumiblesPage />} />
        <Route path="/consumibles/:id" element={<ConsumibleDetailPage />} />
        <Route path="/entregas" element={<EntregasPage />} />
        <Route path="/entregas/nueva" element={<EntregaFormPage />} />
        <Route path="/entregas/:id" element={<EntregaDetailPage />} />
        <Route path="/compras" element={<ComprasPage />} />
        <Route path="/reportes" element={<ReportesPage />} />
        <Route
          path="/compras/nueva"
          element={
            <RutaContable>
              <CompraFormPage />
            </RutaContable>
          }
        />
        <Route path="/compras/:id" element={<CompraDetailPage />} />
        <Route
          path="/configuracion"
          element={
            <RutaContable>
              <CatalogosPage />
            </RutaContable>
          }
        />
        <Route
          path="/catalogos"
          element={
            <RutaContable>
              <CatalogosPage />
            </RutaContable>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RutaContable>
              <UsuariosPage />
            </RutaContable>
          }
        />
        <Route
          path="/auditoria"
          element={
            <RutaContable>
              <AuditoriaPage />
            </RutaContable>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
