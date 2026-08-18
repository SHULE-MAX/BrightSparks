import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout, { RequireAuth } from './components/Layout.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';

import Login from './pages/Login.jsx';
import Analytics from './pages/Analytics.jsx';
import CalendarManager from './pages/CalendarManager.jsx';
import NewsManager from './pages/NewsManager.jsx';
import ResourcesManager from './pages/ResourcesManager.jsx';
import GalleryManager from './pages/GalleryManager.jsx';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<Analytics />} />
              <Route path="calendar" element={<CalendarManager />} />
              <Route path="news" element={<NewsManager />} />
              <Route path="resources" element={<ResourcesManager />} />
              <Route path="gallery" element={<GalleryManager />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
