import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProblemDetail from './pages/ProblemDetail';
import AdminDashboard from './pages/AdminDashboard';
import LabAdminDashboard from './pages/LabAdminDashboard';
import MyProfile from './pages/MyProfile';
import MyProgress from './pages/MyProgress';
import { Moon, Sun } from 'lucide-react';

const defaultPathForRole = (role) => {
    if (role === 'superadmin') return '/super-admin';
    if (role === 'labadmin') return '/lab-admin';
    if (role === 'admin') return '/admin';
    return '/dashboard';
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

const AppContent = () => {
    const { theme, toggleTheme, user } = useAuth();

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
                <Route path="/dashboard" element={<PrivateRoute allowedRoles={['student']}><Dashboard /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute allowedRoles={['student']}><MyProfile /></PrivateRoute>} />
                <Route path="/progress" element={<PrivateRoute allowedRoles={['student']}><MyProgress /></PrivateRoute>} />
                <Route path="/admin" element={<PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>} />
                <Route path="/super-admin" element={<PrivateRoute allowedRoles={['superadmin']}><AdminDashboard /></PrivateRoute>} />
                <Route path="/lab-admin" element={<PrivateRoute allowedRoles={['labadmin']}><LabAdminDashboard /></PrivateRoute>} />
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
