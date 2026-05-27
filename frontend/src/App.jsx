import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ProblemDetail from './pages/ProblemDetail';
import AdminDashboard from './pages/AdminDashboard';
import LabAdminDashboard from './pages/LabAdminDashboard';
import MyProfile from './pages/MyProfile';
import MyProgress from './pages/MyProgress';
import { Moon, Sun, AlertTriangle } from 'lucide-react';
import { isFirebaseConfigured } from './firebase';

const defaultPathForRole = (role) => {
    if (role === 'hod') return '/hod-dashboard';
    if (role === 'labAdmin' || role === 'labadmin') return '/lab-admin-dashboard';
    if (role === 'faculty') return '/faculty-dashboard';
    return '/student-dashboard';
};

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {string[]} [props.allowedRoles] — if set, only these roles may access the route
 */
const PrivateRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={defaultPathForRole(user.role)} replace />;
    }
    return children;
};

const FirebaseSetupWarning = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', background: '#0a0a0a' }}>
        <div style={{ maxWidth: '520px', textAlign: 'center', padding: '3rem 2rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '1rem' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
            <h1 style={{ color: '#ef4444', fontSize: '1.5rem', margin: '0 0 0.75rem' }}>Firebase Not Configured</h1>
            <p style={{ color: '#9ca3af', margin: '0 0 1rem', lineHeight: 1.6 }}>
                Set the following in <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', color: '#e7c965' }}>frontend/.env</code> and restart:
            </p>
            <pre style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px', textAlign: 'left', fontSize: '0.75rem', color: '#34d399', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)' }}>
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
            </pre>
            <p style={{ color: '#6b7280', marginTop: '1rem', fontSize: '0.85rem' }}>
                Get these from Firebase Console &rarr; Project Settings &rarr; General &rarr; Your apps &rarr; Web app
            </p>
        </div>
    </div>
);

const AppContent = () => {
    const { theme, toggleTheme, user } = useAuth();

    if (!isFirebaseConfigured) {
        return <FirebaseSetupWarning />;
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
            <button
                type="button"
                onClick={toggleTheme}
                className="btn glass"
                style={{ position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 1000, borderRadius: '2rem', padding: '12px' }}
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <Routes>
                <Route
                    path="/login"
                    element={
                        !user ? (
                            <LoginPage />
                        ) : (
                            <Navigate to={defaultPathForRole(user.role)} replace />
                        )
                    }
                />
                <Route
                    path="/register"
                    element={
                        !user ? (
                            <RegisterPage />
                        ) : (
                            <Navigate to={defaultPathForRole(user.role)} replace />
                        )
                    }
                />
                <Route path="/student-dashboard" element={<PrivateRoute allowedRoles={['student']}><Dashboard /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute allowedRoles={['student']}><MyProfile /></PrivateRoute>} />
                <Route path="/progress" element={<PrivateRoute allowedRoles={['student']}><MyProgress /></PrivateRoute>} />
                <Route path="/hod-dashboard" element={<PrivateRoute allowedRoles={['hod']}><AdminDashboard /></PrivateRoute>} />
                <Route path="/faculty-dashboard" element={<PrivateRoute allowedRoles={['faculty']}><AdminDashboard /></PrivateRoute>} />
                <Route path="/lab-admin-dashboard" element={<PrivateRoute allowedRoles={['labAdmin', 'labadmin']}><LabAdminDashboard /></PrivateRoute>} />
                <Route path="/problem/:id" element={<PrivateRoute allowedRoles={['student']}><ProblemDetail /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppContent />
            </Router>
        </AuthProvider>
    );
}

export default App;
