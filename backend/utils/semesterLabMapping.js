/**
 * Semester-based automatic lab assignment mapping.
 * Maps Year + Semester to assigned lab names.
 */

const SEMESTER_LAB_MAP = {
    '2': {
        '2-1': ['ADSAA', 'JAVA', 'PYTHON'],
        '2-2': ['OS', 'DBMS']
    },
    '3': {
        '3-1': ['FSAD', 'AI', 'CN', 'TNK'],
        '3-2': ['ML', 'C&NS']
    }
};

const SEMESTER_OPTIONS = ['2-1', '2-2', '3-1', '3-2'];

/**
 * Returns the list of assigned labs for a given year and semester.
 * @param {string} year - e.g. '2nd Year'
 * @param {string} semester - e.g. '2-1'
 * @returns {string[]} Array of lab names
 */
function getLabsForYearSemester(year, semester) {
    const yearNum = extractYearNumber(year);
    if (!yearNum) return [];
    const yearMap = SEMESTER_LAB_MAP[yearNum];
    if (!yearMap) return [];
    return yearMap[semester] || [];
}

/**
 * Extract numeric year from year string like '2nd Year' -> '2'
 */
function extractYearNumber(year) {
    if (!year) return null;
    const match = year.match(/^(\d+)/);
    return match ? match[1] : null;
}

/**
 * Check if a year+semester combination has a valid lab mapping.
 */
function isValidYearSemester(year, semester) {
    const yearNum = extractYearNumber(year);
    if (!yearNum) return false;
    return !!(
        SEMESTER_LAB_MAP[yearNum] && 
        SEMESTER_LAB_MAP[yearNum][semester]
    );
}

module.exports = {
    SEMESTER_LAB_MAP,
    SEMESTER_OPTIONS,
    getLabsForYearSemester,
    extractYearNumber,
    isValidYearSemester
};
