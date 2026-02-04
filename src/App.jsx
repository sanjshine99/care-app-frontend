import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./contexts/AuthContext";
import MainLayout from "./components/Layout/MainLayout";
import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import CareGiversList from "./pages/CareGivers/CareGiversList";
import CareGiverForm from "./pages/CareGivers/CareGiverForm";
import CareReceiversList from "./pages/CareReceivers/CareReceiversList";
import Notifications from "./pages/Notifications/Notifications";
import Settings from "./pages/Settings/Settings";
import Schedule from "./pages/Schedule/Schedule";
import Map from "./pages/Map/Map";
import CareGiverAvailability from "./pages/CareGivers/CareGiverAvailability";
import CareGiverDetail from "./pages/CareGivers/CareGiverDetail";
import CareReceiverForm from "./pages/CareReceivers/CareReceiverForm";
import CareReceiverDetail from "./pages/CareReceivers/CareReceiverDetail";
import GenerateSchedule from "./pages/Schedule/GenerateSchedule";

// Protected route wrapper
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

// Public route wrapper (redirect if authenticated)
function PublicRoute({ children }) {
  const token = localStorage.getItem("token");
  return !token ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected routes with layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Care Givers */}
            <Route path="caregivers" element={<CareGiversList />} />
            <Route path="caregivers/new" element={<CareGiverForm />} />
            <Route path="caregivers/:id" element={<CareGiverDetail />} />
            <Route path="caregivers/:id/edit" element={<CareGiverForm />} />
            <Route
              path="caregivers/:id/availability"
              element={<CareGiverAvailability />}
            />
            {/* Care Receivers */}
            <Route path="carereceivers" element={<CareReceiversList />} />
            <Route path="carereceivers/new" element={<CareReceiverForm />} />
            <Route path="carereceivers/:id" element={<CareReceiverDetail />} />
            <Route path="carereceivers/:id/edit" element={<CareReceiverForm />} />

            {/* Schedule */}
            <Route path="schedule" element={<Schedule />} />
            <Route path="schedule/generate" element={<GenerateSchedule />} />

            {/* Map - ADD THIS ROUTE */}
            <Route path="map" element={<Map />} />

            {/* Notifications */}
            <Route path="notifications" element={<Notifications />} />

            {/* Settings */}
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Toast notifications */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
