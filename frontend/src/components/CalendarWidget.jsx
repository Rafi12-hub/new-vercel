import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Clock, Tag, Info } from 'lucide-react';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarWidget = ({ role, labName }) => {
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        start: new Date(),
        end: new Date(),
        type: 'lab',
        color: '#8254ee'
    });

    useEffect(() => {
        fetchEvents();
    }, [labName]);

    const fetchEvents = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/schedule', {
                headers: { 'x-auth-token': token }
            });
            // Convert strings to Date objects for the calendar
            const formattedEvents = res.data.map(event => ({
                ...event,
                start: new Date(event.start),
                end: new Date(event.end)
            }));
            setEvents(formattedEvents);
        } catch (err) {
            console.error("Error fetching calendar events", err);
        }
    };

    const handleSelectSlot = ({ start, end }) => {
        if (role === 'student') return;
        setNewEvent({ ...newEvent, start, end });
        setShowModal(true);
        setSelectedEvent(null);
    };

    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
        setShowModal(true);
    };

    const handleSaveEvent = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/schedule', newEvent, {
                headers: { 'x-auth-token': token }
            });
            setEvents([...events, { ...res.data, start: new Date(res.data.start), end: new Date(res.data.end) }]);
            setShowModal(false);
            setNewEvent({ title: '', description: '', start: new Date(), end: new Date(), type: 'lab', color: '#8254ee' });
        } catch (err) {
            alert("Failed to save event");
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/schedule/${selectedEvent._id}`, {
                headers: { 'x-auth-token': token }
            });
            setEvents(events.filter(e => e._id !== selectedEvent._id));
            setShowModal(false);
        } catch (err) {
            alert("Failed to delete event");
        }
    };

    const eventStyleGetter = (event) => {
        const style = {
            backgroundColor: event.color || '#8254ee',
            borderRadius: '8px',
            opacity: 0.9,
            color: 'white',
            border: 'none',
            display: 'block',
            fontSize: '0.85rem',
            padding: '2px 5px'
        };
        return { style };
    };

    return (
        <div className="card" style={{ height: '600px', padding: '1.5rem', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={24} style={{ color: '#8254ee' }} /> Lab Schedule & Events
                </h2>
                {role !== 'student' && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                        <Plus size={18} /> Add Event
                    </button>
                )}
            </div>

            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%', color: '#ffffff' }}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                selectable={role !== 'student'}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'day']}
            />

            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="card" 
                            style={{ width: '100%', maxWidth: '500px', background: '#1b1830', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, color: '#ffffff' }}>{selectedEvent ? 'Event Details' : 'Add New Event'}</h3>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#d6d6d6', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Event Title</label>
                                    <input 
                                        type="text" 
                                        className="card" 
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                        value={selectedEvent ? selectedEvent.title : newEvent.title}
                                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                        disabled={!!selectedEvent && role === 'student'}
                                        placeholder="e.g. Week 4 Unlock"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#d6d6d6', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Description</label>
                                    <textarea 
                                        className="card" 
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', minHeight: '80px' }}
                                        value={selectedEvent ? selectedEvent.description : newEvent.description}
                                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                        disabled={!!selectedEvent && role === 'student'}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', color: '#d6d6d6', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Type</label>
                                        <select 
                                            className="card" 
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                            value={selectedEvent ? selectedEvent.type : newEvent.type}
                                            onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                                            disabled={!!selectedEvent && role === 'student'}
                                        >
                                            <option value="lab">Lab Session</option>
                                            <option value="unlock">Week Unlock</option>
                                            <option value="test">Coding Test</option>
                                            <option value="deadline">Deadline</option>
                                            <option value="announcement">Announcement</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', color: '#d6d6d6', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Color</label>
                                        <input 
                                            type="color" 
                                            style={{ width: '100%', height: '42px', border: 'none', background: 'none', cursor: 'pointer' }}
                                            value={selectedEvent ? selectedEvent.color : newEvent.color}
                                            onChange={(e) => setNewEvent({ ...newEvent, color: e.target.value })}
                                            disabled={!!selectedEvent && role === 'student'}
                                        />
                                    </div>
                                </div>
                                
                                {selectedEvent && (
                                    <div style={{ background: 'rgba(130, 84, 238, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(130, 84, 238, 0.2)' }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#d6d6d6' }}>
                                            <strong>Created By:</strong> {selectedEvent.createdBy?.name || 'Admin'} ({selectedEvent.createdBy?.role})
                                        </p>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    {selectedEvent ? (
                                        role !== 'student' && (
                                            <button className="btn" onClick={handleDeleteEvent} style={{ flex: 1, background: '#ff5c5c', color: 'white' }}>Delete Event</button>
                                        )
                                    ) : (
                                        <button className="btn btn-primary" onClick={handleSaveEvent} style={{ flex: 1 }}>Create Event</button>
                                    )}
                                    <button className="btn glass" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Close</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .rbc-calendar { background: transparent !important; }
                .rbc-month-view, .rbc-time-view { border: 1px solid rgba(255,255,255,0.1) !important; color: #ffffff !important; }
                .rbc-off-range-bg { background: rgba(0,0,0,0.2) !important; }
                .rbc-today { background: rgba(130, 84, 238, 0.1) !important; }
                .rbc-header { border-bottom: 1px solid rgba(255,255,255,0.1) !important; padding: 10px !important; color: #e7c965 !important; font-weight: bold !important; }
                .rbc-month-row { border-top: 1px solid rgba(255,255,255,0.1) !important; }
                .rbc-day-bg { border-left: 1px solid rgba(255,255,255,0.1) !important; }
                .rbc-event { border: none !important; box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important; }
                .rbc-toolbar button { color: #ffffff !important; background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.1) !important; }
                .rbc-toolbar button:active, .rbc-toolbar button.rbc-active { background: #8254ee !important; border-color: #8254ee !important; }
                .rbc-toolbar button:hover { background: rgba(255,255,255,0.1) !important; }
                .rbc-month-view .rbc-header + .rbc-header { border-left: 1px solid rgba(255,255,255,0.1) !important; }
            `}</style>
        </div>
    );
};

export default CalendarWidget;
