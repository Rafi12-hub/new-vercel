import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProblemDetail from './pages/ProblemDetail';
import AdminDashboard from './pages/AdminDashboard';
import MyProfile from './pages/MyProfile';
import MyProgress from './pages/MyProgress';
import { Moon, Sun } from 'lucide-react';

const PrivateRoute = ({ children, role }) => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    if (role === 'admin' && (user.role === 'superadmin' || user.role === 'labadmin')) return children;
    if (role && user.role !== role) return <Navigate to="/dashboard" />;
    return children;
};

const AppContent = () => {
    const { theme, toggleTheme, user } = useAuth();

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
            {/* Simple Floating Theme Toggle */}
            <button 
                onClick={toggleTheme} 
                className="btn glass" 
                style={{ position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 1000, borderRadius: '2rem', padding: '12px' }}
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <Routes>
                <Route path="/login" element={!user ? <LoginPage /> : (
                    user.role === 'superadmin' ? <Navigate to="/super-admin" /> : 
                    user.role === 'labadmin' ? <Navigate to="/lab-admin" /> : 
                    user.role === 'admin' ? <Navigate to="/admin" /> :
                    <Navigate to="/dashboard" />
                )} />
                <Route path="/dashboard" element={<PrivateRoute role="student"><Dashboard /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute role="student"><MyProfile /></PrivateRoute>} />
                <Route path="/progress" element={<PrivateRoute role="student"><MyProgress /></PrivateRoute>} />
                <Route path="/admin" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
                <Route path="/super-admin" element={<PrivateRoute role="superadmin"><AdminDashboard /></PrivateRoute>} />
                <Route path="/lab-admin" element={<PrivateRoute role="labadmin"><AdminDashboard /></PrivateRoute>} />
                <Route path="/problem/:id" element={<PrivateRoute role="student"><ProblemDetail /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/login" />} />
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
