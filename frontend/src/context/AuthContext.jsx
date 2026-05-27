import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    const fetchUser = useCallback(async (token) => {
        try {
            try {
                const res = await axios.get('http://localhost:5000/api/auth/me', {
                    headers: { 'x-auth-token': token },
                });
                setUser({ ...res.data, role: 'student' });
            } catch (err) {
                if (!err.response) {
                    throw err; // network error
                }
                const resAdmin = await axios.get('http://localhost:5000/api/admin/me', {
                    headers: { 'x-auth-token': token },
                });
                setUser({ ...resAdmin.data });
            }
        } catch (err) {
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                console.warn('Session expired or invalid token. Clearing credentials.');
                localStorage.removeItem('token');
            } else {
                console.error('Failed to load user session due to network issue:', err.message);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        const t = window.setTimeout(() => {
            const token = localStorage.getItem('token');
            if (token) {
                void fetchUser(token);
            } else {
                setLoading(false);
            }
        }, 0);
        return () => window.clearTimeout(t);
    }, [fetchUser]);

    const refreshUser = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await axios.get('http://localhost:5000/api/auth/me', {
                headers: { 'x-auth-token': token },
            });
            setUser({ ...res.data, role: 'student' });
        } catch {
            try {
                const resAdmin = await axios.get('http://localhost:5000/api/admin/me', {
                    headers: { 'x-auth-token': token },
                });
                setUser({ ...resAdmin.data });
            } catch {
                /* keep session */
            }
        }
    };

    const login = async (regNo, password, selectedLab) => {
        const res = await axios.post('http://localhost:5000/api/auth/login', { regNo, password, selectedLab });
        localStorage.setItem('token', res.data.token);
        const userData = { ...res.data.user, role: 'student', activeLab: res.data.activeLab || '' };
        setUser(userData);
        return res.data;
    };

    const register = async (userData) => {
        const res = await axios.post('http://localhost:5000/api/auth/register', userData);
        localStorage.setItem('token', res.data.token);
        const userData2 = { ...res.data.user, role: 'student', activeLab: res.data.activeLab || '' };
        setUser(userData2);
        return res.data;
    };

    /** @param {string} expectedRole - 'hod' | 'faculty' | 'labadmin' | 'admin' */
    const loginAdmin = async (email, password, expectedRole) => {
        const res = await axios.post('http://localhost:5000/api/admin/login', {
            email,
            password,
            expectedRole,
        });
        localStorage.setItem('token', res.data.token);
        setUser({ ...res.data.admin });
        return res.data;
    };

    const logout = () => {
        localStorage.clear();
        sessionStorage.clear();
        setUser(null);
        window.location.href = '/login';
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, loginAdmin, logout, theme, toggleTheme, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

// useAuth is intentionally co-located with AuthProvider for this app bundle.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
