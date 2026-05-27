const { LABS_STANDARD } = require('./constants');

const LAB_VARIATIONS = {
  'C': ['c', 'c lab', 'c programming', 'c-programming', 'cprogramming', 'c language'],
  'DS': ['ds', 'data structures', 'data-structures', 'data structures lab', 'ds lab', 'datastructures'],
  'ADSAA': ['adsaa', 'ada', 'algorithm design', 'algorithm', 'algorithms', 'adsaa lab'],
  'JAVA': ['java', 'java lab', 'java programming', 'java-programming', 'javalab'],
  'PYTHON': ['python', 'python lab', 'python programming', 'python-programming', 'pythonlab'],
  'DBMS': ['dbms', 'database', 'database management', 'dbms lab', 'database lab'],
  'OS': ['os', 'operating system', 'operating systems', 'os lab', 'oslab'],
  'CN': ['cn', 'computer networks', 'computer network', 'cn lab', 'networks'],
  'AI': ['ai', 'artificial intelligence', 'ai lab', 'ailab'],
  'ML': ['ml', 'machine learning', 'ml lab', 'mllab'],
  'FSAD': ['fsad', 'full stack', 'full stack development', 'fullstack', 'fsad lab', 'web development'],
  'TNK': ['tnk', 'tinkering', 'tinkering lab', 'tnk lab', 'innovation lab'],
  'C&NS': ['c&ns', 'cns', 'cryptography', 'network security', 'cns lab', 'c&ns lab', 'cryptography and network security']
};

function normalizeLabName(labName) {
  if (!labName) return '';
  const trimmed = labName.trim();
  
  // Direct match with standard lab IDs
  for (const standard of LABS_STANDARD) {
    if (trimmed.toUpperCase() === standard) return standard;
  }
  
  // Check variations
  const lower = trimmed.toLowerCase();
  for (const [standard, variations] of Object.entries(LAB_VARIATIONS)) {
    for (const variant of variations) {
      if (lower === variant) return standard;
    }
  }
  
  // Fuzzy match - check if input contains a standard ID or variation
  for (const [standard, variations] of Object.entries(LAB_VARIATIONS)) {
    if (variations.some(v => lower.includes(v) || v.includes(lower))) {
      return standard;
    }
  }
  
  // Return uppercase of input as fallback
  return trimmed.toUpperCase();
}

function labNameRegex(labName) {
  const normalized = normalizeLabName(labName);
  if (!normalized) return null;
  return new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

module.exports = { LABS_STANDARD, LAB_VARIATIONS, normalizeLabName, labNameRegex };
