import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchUser(token);
        } else {
            setLoading(false);
        }
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const fetchUser = async (token) => {
        try {
            // First try student
            try {
                const res = await axios.get('http://localhost:5000/api/auth/me', {
                    headers: { 'x-auth-token': token }
                });
                setUser({ ...res.data, role: 'student' });
            } catch (studentErr) {
                // If fails, try admin
                const resAdmin = await axios.get('http://localhost:5000/api/admin/me', {
                    headers: { 'x-auth-token': token }
                });
                setUser({ ...resAdmin.data });
            }
        } catch (err) {
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (regNo, password) => {
        const res = await axios.post('http://localhost:5000/api/auth/login', { regNo, password });
        localStorage.setItem('token', res.data.token);
        setUser({ ...res.data.user, role: 'student' });
        return res.data;
    };

    const loginAdmin = async (email, password) => {
        const res = await axios.post('http://localhost:5000/api/admin/login', { email, password });
        localStorage.setItem('token', res.data.token);
        setUser({ ...res.data.admin });
        return res.data.admin;
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
        console.log(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode enabled`);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, loginAdmin, logout, theme, toggleTheme }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
