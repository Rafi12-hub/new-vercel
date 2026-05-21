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
            } catch {
                const resAdmin = await axios.get('http://localhost:5000/api/admin/me', {
                    headers: { 'x-auth-token': token },
                });
                setUser({ ...resAdmin.data });
            }
        } catch {
            localStorage.removeItem('token');
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

    const login = async (regNo, dob) => {
        const res = await axios.post('http://localhost:5000/api/auth/login', { regNo, dob });
        localStorage.setItem('token', res.data.token);
        setUser({ ...res.data.user, role: 'student' });
        return res.data;
    };

    /** @param {string} expectedRole - 'superadmin' | 'labadmin' | 'admin' */
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
        <AuthContext.Provider value={{ user, loading, login, loginAdmin, logout, theme, toggleTheme, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

// useAuth is intentionally co-located with AuthProvider for this app bundle.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
