import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./contexts/AuthContext";
import { UnscheduledCheckProvider } from "./contexts/UnscheduledCheckContext";
import { ScheduleGenerationProvider } from "./contexts/ScheduleGenerationContext";
import { ConfirmDialogProvider } from "./contexts/ConfirmDialogContext";
import ErrorBoundary from "./components/ErrorBoundary";

// MainLayout is always needed for authenticated routes — keep eager
import MainLayout from "./components/Layout/MainLayout";

// Lazy-load all page components — each becomes a separate JS chunk
const Login = lazy(() => import("./pages/Auth/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const CareGiversList = lazy(() => import("./pages/CareGivers/CareGiversList"));
const CareGiverForm = lazy(() => import("./pages/CareGivers/CareGiverForm"));
const CareGiverDetail = lazy(() => import("./pages/CareGivers/CareGiverDetail"));
const CareGiverAvailability = lazy(() => import("./pages/CareGivers/CareGiverAvailability"));
const CareReceiversList = lazy(() => import("./pages/CareReceivers/CareReceiversList"));
const CareReceiverForm = lazy(() => import("./pages/CareReceivers/CareReceiverForm"));
const CareReceiverDetail = lazy(() => import("./pages/CareReceivers/CareReceiverDetail"));
const Schedule = lazy(() => import("./pages/Schedule/Schedule"));
const GenerateSchedule = lazy(() => import("./pages/Schedule/GenerateSchedule"));
const Notifications = lazy(() => import("./pages/Notifications/Notifications"));
const Map = lazy(() => import("./pages/Map/Map"));
const Settings = lazy(() => import("./pages/Settings/Settings"));
const UsersList = lazy(() => import("./pages/Users/UsersList"));
const UserForm = lazy(() => import("./pages/Users/UserForm"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  );
}

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
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <UnscheduledCheckProvider>
        <ConfirmDialogProvider>
        <ScheduleGenerationProvider>
        <Suspense fallback={<PageLoader />}>
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

            {/* Map */}
            <Route path="map" element={<Map />} />

            {/* Notifications */}
            <Route path="notifications" element={<Notifications />} />

            {/* Users */}
            <Route path="users" element={<UsersList />} />
            <Route path="users/new" element={<UserForm />} />
            <Route path="users/:id/edit" element={<UserForm />} />

            {/* Settings */}
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>

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
        </ScheduleGenerationProvider>
        </ConfirmDialogProvider>
        </UnscheduledCheckProvider>
      </AuthProvider>
    </BrowserRouter>
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
