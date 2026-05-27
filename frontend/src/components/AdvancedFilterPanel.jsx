import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, SlidersHorizontal, X, ChevronDown, Clock, Code2, CheckSquare, Award, Target, Activity, ArrowUpDown, RotateCcw, Sparkles, BookOpen, Users, Hash, TrendingUp } from 'lucide-react';

const LABS = ["Data Structures Lab", "C", "DS", "ADSAA", "JAVA", "PYTHON", "DBMS", "OS", "CN", "AI", "ML", "FSAD"];
const LANGUAGES = ['C', 'C++', 'Java', 'Python', 'JavaScript'];
const SEARCH_SUGGESTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Section A', 'Section B', 'Section C', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];

const glassCard = {
    background: 'rgba(18,18,18,0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
};

const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '0.8rem',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e0e0e0',
    outline: 'none',
    transition: 'all 0.25s ease',
    boxSizing: 'border-box',
};

const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '32px',
};

const Section = ({ title, icon, children, open: defaultOpen = false, badge }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0', background: 'none', border: 'none', color: '#d4d4d4', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
                <span style={{ opacity: 0.7 }}>{icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
                {badge && <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(130,84,238,0.15)', color: '#8254ee', fontWeight: 700 }}>{badge}</span>}
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={12} />
                </motion.div>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '0.4rem 0 0.2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SelectRow = ({ label, value, onChange, options, style: rowStyle }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', ...rowStyle }}>
        <span style={{ fontSize: '0.7rem', color: '#999', minWidth: '75px', flexShrink: 0 }}>{label}</span>
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={selectStyle}
        >
            {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
    </div>
);

const InputRow = ({ label, value, onChange, type = 'number', placeholder, style: rowStyle }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', ...rowStyle }}>
        <span style={{ fontSize: '0.7rem', color: '#999', minWidth: '75px', flexShrink: 0 }}>{label}</span>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={inputStyle}
        />
    </div>
);

const Chip = ({ label, active, onClick, color = '#8254ee' }) => (
    <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        style={{
            padding: '3px 10px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 500,
            background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
            color: active ? color : '#aaa',
            cursor: 'pointer', transition: 'all 0.2s'
        }}
    >
        {label}
        {active && <X size={10} style={{ marginLeft: '4px', display: 'inline', verticalAlign: 'middle' }} />}
    </motion.button>
);

const FilterBadge = ({ count }) => (
    <span style={{
        background: 'linear-gradient(135deg, #8254ee, #a78bfa)',
        color: '#fff',
        borderRadius: '50%',
        width: '20px',
        height: '20px',
        fontSize: '0.65rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        boxShadow: '0 2px 8px rgba(130,84,238,0.4)'
    }}>
        {count}
    </span>
);

const AdvancedFilterPanel = ({ filters, onFilterChange, onReset, onSearch, totalResults }) => {
    const [showPanel, setShowPanel] = useState(false);
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const panelRef = useRef(null);
    const searchRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        setSearchValue(filters.search || '');
    }, [filters.search]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateFilter = (key, value) => {
        onFilterChange({ ...filters, [key]: value || '' });
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchValue(val);
        setShowSuggestions(val.length > 0);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            onSearch(val);
        }, 300);
    };

    const handleSearchSuggestion = (suggestion) => {
        setSearchValue(suggestion);
        setShowSuggestions(false);
        onSearch(suggestion);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            setShowSuggestions(false);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            onSearch(searchValue);
        }
    };

    const handleReset = () => {
        setSearchValue('');
        setShowSuggestions(false);
        onReset();
    };

    const filterCount = Object.entries(filters).filter(([k, v]) => v && k !== 'search' && k !== 'page' && k !== 'limit').length;

    const filteredSuggestions = SEARCH_SUGGESTIONS.filter(
        s => s.toLowerCase().includes(searchValue.toLowerCase()) && searchValue.length > 0
    );

    const btnStyle = (active = false) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '10px 18px',
        borderRadius: '12px',
        fontSize: '0.8rem',
        border: `1px solid ${active ? 'rgba(130,84,238,0.3)' : 'rgba(255,255,255,0.08)'}`,
        background: active ? 'linear-gradient(135deg, rgba(130,84,238,0.15), rgba(167,139,250,0.08))' : 'rgba(255,255,255,0.04)',
        color: active ? '#a78bfa' : '#ccc',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.25s ease',
        fontWeight: active ? 600 : 400,
    });

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div ref={searchRef} style={{ position: 'relative', flex: '1 1 300px', minWidth: '200px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${searchValue ? 'rgba(130,84,238,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '12px',
                        padding: '0 12px',
                        transition: 'border-color 0.25s ease',
                    }}>
                        <Search size={16} style={{ color: searchValue ? '#a78bfa' : '#555', flexShrink: 0 }} />
                        <input
                            ref={searchRef}
                            type="text"
                            value={searchValue}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => searchValue && setShowSuggestions(true)}
                            placeholder="Search name, reg no, branch, section, year, lab, language..."
                            style={{
                                width: '100%',
                                padding: '10px 10px',
                                fontSize: '0.85rem',
                                border: 'none',
                                background: 'transparent',
                                color: '#e0e0e0',
                                outline: 'none',
                            }}
                        />
                        {searchValue && (
                            <button
                                onClick={() => { setSearchValue(''); setShowSuggestions(false); onSearch(''); }}
                                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <AnimatePresence>
                        {showSuggestions && filteredSuggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 4px)',
                                    left: 0,
                                    right: 0,
                                    ...glassCard,
                                    padding: '6px',
                                    zIndex: 50,
                                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                                }}
                            >
                                {filteredSuggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSearchSuggestion(s)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            textAlign: 'left',
                                            background: 'none',
                                            border: 'none',
                                            color: '#ccc',
                                            cursor: 'pointer',
                                            borderRadius: '8px',
                                            fontSize: '0.8rem',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.target.style.background = 'rgba(130,84,238,0.1)'}
                                        onMouseLeave={e => e.target.style.background = 'none'}
                                    >
                                        <Search size={12} style={{ marginRight: '8px', color: '#555' }} />
                                        {s}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowPanel(!showPanel)}
                    style={btnStyle(showPanel || filterCount > 0)}
                >
                    <SlidersHorizontal size={16} />
                    Filters
                    {filterCount > 0 && <FilterBadge count={filterCount} />}
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    style={{
                        ...btnStyle(),
                        color: '#fbbf24',
                        borderColor: 'rgba(251,191,36,0.15)',
                        background: 'rgba(251,191,36,0.06)',
                    }}
                >
                    <RotateCcw size={14} />
                    Reset
                </motion.button>

                {totalResults !== undefined && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={totalResults}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.75rem',
                            color: '#888',
                            whiteSpace: 'nowrap',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <Hash size={12} />
                        {totalResults} result{totalResults !== 1 ? 's' : ''}
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {showPanel && (
                    <motion.div
                        ref={panelRef}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <motion.div
                            initial={{ y: -10 }}
                            animate={{ y: 0 }}
                            style={{
                                marginTop: '0.75rem',
                                padding: '1.5rem',
                                ...glassCard,
                                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                            }}
                        >
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                gap: '1.25rem',
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(130,84,238,0.15)' }}>
                                        <Filter size={14} color="#8254ee" />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8254ee', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Basic Filters</span>
                                    </div>
                                    <SelectRow label="Year" value={filters.year || ''} onChange={v => updateFilter('year', v)} options={[
                                        { value: '', label: 'All Years' },
                                        { value: '1st Year', label: '1st Year' },
                                        { value: '2nd Year', label: '2nd Year' },
                                        { value: '3rd Year', label: '3rd Year' },
                                        { value: '4th Year', label: '4th Year' },
                                    ]} />
                                    <SelectRow label="Section" value={filters.section || ''} onChange={v => updateFilter('section', v)} options={[
                                        { value: '', label: 'All Sections' },
                                        { value: 'A', label: 'A' },
                                        { value: 'B', label: 'B' },
                                        { value: 'C', label: 'C' },
                                    ]} />
                                    <SelectRow label="Branch" value={filters.branch || ''} onChange={v => updateFilter('branch', v)} options={[
                                        { value: '', label: 'All Branches' },
                                        { value: 'CSE', label: 'CSE' },
                                        { value: 'ECE', label: 'ECE' },
                                        { value: 'EEE', label: 'EEE' },
                                        { value: 'MECH', label: 'MECH' },
                                        { value: 'CIVIL', label: 'CIVIL' },
                                        { value: 'IT', label: 'IT' },
                                    ]} />
                                    <SelectRow label="Lab" value={filters.lab || ''} onChange={v => updateFilter('lab', v)} options={[
                                        { value: '', label: 'All Labs' },
                                        ...LABS.map(l => ({ value: l, label: l }))
                                    ]} />
                                    <SelectRow label="Language" value={filters.language || ''} onChange={v => updateFilter('language', v)} options={[
                                        { value: '', label: 'All Languages' },
                                        ...LANGUAGES.map(l => ({ value: l, label: l }))
                                    ]} />
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(52,211,153,0.15)' }}>
                                        <Clock size={14} color="#34d399" />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time & Language</span>
                                    </div>
                                    <Section title="Time Solved" icon={<Clock size={12} color="#34d399" />} open>
                                        <SelectRow label="Filter" value={filters.timeSolved || ''} onChange={v => updateFilter('timeSolved', v)} options={[
                                            { value: '', label: 'None' },
                                            { value: 'fastest', label: 'Fastest Solving' },
                                            { value: 'slowest', label: 'Slowest Solving' },
                                            { value: 'average', label: 'Average Time' },
                                        ]} />
                                        {filters.timeSolved && (
                                            <SelectRow label="Order" value={filters.timeSolvedOrder || 'asc'} onChange={v => updateFilter('timeSolvedOrder', v)} options={[
                                                { value: 'asc', label: 'Ascending' },
                                                { value: 'desc', label: 'Descending' },
                                            ]} />
                                        )}
                                    </Section>
                                    <Section title="Language Proficiency" icon={<Code2 size={12} color="#56b6c2" />}>
                                        <SelectRow label="Show by" value={filters.languageProficiency || ''} onChange={v => updateFilter('languageProficiency', v)} options={[
                                            { value: '', label: 'Default' },
                                            { value: 'best', label: 'Best Language' },
                                            { value: 'mostSuccessful', label: 'Most Successful' },
                                            { value: 'highestAccepted', label: 'Highest Accepted' },
                                            { value: 'mostUsed', label: 'Most Used' },
                                        ]} />
                                    </Section>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(231,201,101,0.15)' }}>
                                        <TrendingUp size={14} color="#e7c965" />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e7c965', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Solved & Points</span>
                                    </div>
                                    <Section title="Solved" icon={<CheckSquare size={12} color="#e7c965" />} open>
                                        <SelectRow label="Filter" value={filters.solvedFilter || ''} onChange={v => updateFilter('solvedFilter', v)} options={[
                                            { value: '', label: 'None' },
                                            { value: 'total', label: 'Total Solved' },
                                            { value: 'weekly', label: 'Weekly Solved' },
                                            { value: 'monthly', label: 'Monthly Solved' },
                                            { value: 'fullyCompleted', label: 'Fully Completed' },
                                            { value: 'pending', label: 'Pending Problems' },
                                        ]} />
                                        {filters.solvedFilter && filters.solvedFilter !== 'fullyCompleted' && filters.solvedFilter !== 'pending' && (
                                            <SelectRow label="Order" value={filters.solvedOrder || 'desc'} onChange={v => updateFilter('solvedOrder', v)} options={[
                                                { value: 'desc', label: 'High to Low' },
                                                { value: 'asc', label: 'Low to High' },
                                            ]} />
                                        )}
                                    </Section>
                                    <Section title="Points Gained" icon={<Award size={12} color="#f59e0b" />}>
                                        <SelectRow label="Filter" value={filters.pointsFilter || ''} onChange={v => updateFilter('pointsFilter', v)} options={[
                                            { value: '', label: 'None' },
                                            { value: 'highest', label: 'Highest Points' },
                                            { value: 'lowest', label: 'Lowest Points' },
                                            { value: 'weekly', label: 'Weekly Points' },
                                            { value: 'monthly', label: 'Monthly Points' },
                                            { value: 'total', label: 'Total Earned' },
                                        ]} />
                                        {filters.pointsFilter && !['highest', 'lowest'].includes(filters.pointsFilter) && (
                                            <SelectRow label="Order" value={filters.pointsOrder || 'desc'} onChange={v => updateFilter('pointsOrder', v)} options={[
                                                { value: 'desc', label: 'High to Low' },
                                                { value: 'asc', label: 'Low to High' },
                                            ]} />
                                        )}
                                    </Section>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
                                        <Target size={14} color="#ef4444" />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Accuracy & Consistency</span>
                                    </div>
                                    <Section title="Accuracy" icon={<Target size={12} color="#ef4444" />} open>
                                        <SelectRow label="Filter" value={filters.accuracyFilter || ''} onChange={v => updateFilter('accuracyFilter', v)} options={[
                                            { value: '', label: 'None' },
                                            { value: 'highest', label: 'Highest Accuracy' },
                                            { value: 'lowest', label: 'Lowest Accuracy' },
                                            { value: 'exact', label: 'Min Accuracy %' },
                                        ]} />
                                        {filters.accuracyFilter === 'exact' && (
                                            <InputRow label="Min %" value={filters.accuracyValue || ''} onChange={v => updateFilter('accuracyValue', v)} placeholder="e.g. 80" />
                                        )}
                                    </Section>
                                    <Section title="Consistency" icon={<Activity size={12} color="#8254ee" />}>
                                        <SelectRow label="Filter" value={filters.consistencyFilter || ''} onChange={v => updateFilter('consistencyFilter', v)} options={[
                                            { value: '', label: 'None' },
                                            { value: 'daily', label: 'Daily Activity' },
                                            { value: 'weekly', label: 'Weekly Activity' },
                                            { value: 'streak', label: 'Solving Streak' },
                                            { value: 'regular', label: 'Regular Participation' },
                                        ]} />
                                    </Section>
                                </div>
                            </div>

                            {filterCount > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{
                                        marginTop: '1rem',
                                        paddingTop: '0.75rem',
                                        borderTop: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        gap: '0.4rem',
                                        flexWrap: 'wrap',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Sparkles size={12} color="#a78bfa" style={{ marginRight: '0.25rem' }} />
                                    <span style={{ fontSize: '0.65rem', color: '#666', marginRight: '0.25rem' }}>Active:</span>
                                    {Object.entries(filters).filter(([k, v]) => v && k !== 'search' && k !== 'page' && k !== 'limit').map(([k, v]) => (
                                        <Chip key={k} label={`${k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: ${v}`} active color="#8254ee" onClick={() => updateFilter(k, '')} />
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdvancedFilterPanel;
