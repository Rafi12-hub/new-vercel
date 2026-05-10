import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import PremiumHeader from '../components/PremiumHeader';
import { User, Mail, Hash, BookOpen, Layers, Activity } from 'lucide-react';

const MyProfile = () => {
    const { user } = useAuth();

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <PremiumHeader />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="card" 
                style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '2rem' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: 'white', fontWeight: 'bold' }}>
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', margin: 0, marginBottom: '0.5rem' }}>{user?.name || 'Student Name'}</h1>
                        <p style={{ color: 'var(--text-highlight)', margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {user?.regNo || 'Registration Number'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem' }}>
                        <Mail color="var(--primary)" />
                        <div>
                            <p style={{ color: 'var(--text-muted-dark)', margin: 0, fontSize: '0.8rem' }}>Email</p>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{user?.email || 'N/A'}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem' }}>
                        <BookOpen color="var(--primary)" />
                        <div>
                            <p style={{ color: 'var(--text-muted-dark)', margin: 0, fontSize: '0.8rem' }}>Assigned Lab</p>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{user?.selectedLab || 'Not Assigned'}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem' }}>
                        <Hash color="var(--primary)" />
                        <div>
                            <p style={{ color: 'var(--text-muted-dark)', margin: 0, fontSize: '0.8rem' }}>Class & Year</p>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{user?.classAndYear || 'N/A'}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem' }}>
                        <Layers color="var(--primary)" />
                        <div>
                            <p style={{ color: 'var(--text-muted-dark)', margin: 0, fontSize: '0.8rem' }}>Section</p>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{user?.section || 'N/A'}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem', gridColumn: '1 / -1' }}>
                        <Activity color="var(--primary)" />
                        <div style={{ width: '100%' }}>
                            <p style={{ color: 'var(--text-muted-dark)', margin: 0, fontSize: '0.8rem', marginBottom: '0.5rem' }}>Weekly Progress</p>
                            <div style={{ height: '8px', background: 'var(--surface)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, (user?.completedTasks?.length || 0) * 10)}%`, background: 'var(--gradient-primary)' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default MyProfile;
