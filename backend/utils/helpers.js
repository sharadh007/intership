// Format response object
const formatResponse = (success, message = '', data = null, error = null) => {
  return {
    success,
    message,
    data,
    error,
    timestamp: new Date()
  };
};

// Generate random ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Calculate percentage
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

// Capitalize first letter
const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Trim and validate string
const validateString = (str, minLength = 1, maxLength = 255) => {
  if (!str || typeof str !== 'string') return false;
  
  const trimmed = str.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
};

// Parse array safely
const parseArray = (input) => {
  if (Array.isArray(input)) {
    return input;
  }
  
  if (typeof input === 'string') {
    // Split by comma and trim each item
    return input.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }
  
  return [];
};

// Sanitize input (prevent XSS)
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>\"']/g, '') // Remove HTML special characters
    .trim();
};

// Calculate age from date of birth
const calculateAge = (dob) => {
  if (!dob) return null;
  
  const today = new Date();
  const birthDate = new Date(dob);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Check if email exists in array
const emailExists = (email, array) => {
  return array.some(item => item.email?.toLowerCase() === email.toLowerCase());
};

// Sort array by property
const sortByProperty = (array, property, order = 'asc') => {
  return array.sort((a, b) => {
    if (a[property] < b[property]) return order === 'asc' ? -1 : 1;
    if (a[property] > b[property]) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Get unique values from array
const getUniqueValues = (array, property) => {
  return [...new Set(array.map(item => item[property]))];
};

// Filter array by multiple properties
const filterByMultiple = (array, filters) => {
  return array.filter(item => {
    return Object.keys(filters).every(key => {
      const filterValue = filters[key].toLowerCase();
      const itemValue = item[key]?.toString().toLowerCase() || '';
      return itemValue.includes(filterValue);
    });
  });
};

// Format date to readable format
const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
};

// Format date and time
const formatDateTime = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${dateStr} ${hours}:${minutes}`;
};

// Calculate days difference
const daysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  const timeDiff = Math.abs(d2 - d1);
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
};

// Paginate array
const paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: array.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(array.length / limit),
      totalItems: array.length,
      itemsPerPage: limit
    }
  };
};

// Log with timestamp
const logWithTimestamp = (message, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

// Convert object to query string
const objectToQueryString = (obj) => {
  return Object.keys(obj)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
};

// Merge objects safely
const mergeObjects = (target, source) => {
  const result = { ...target };
  
  Object.keys(source).forEach(key => {
    if (source[key] !== undefined && source[key] !== null) {
      result[key] = source[key];
    }
  });
  
  return result;
};

module.exports = {
  formatResponse,
  generateId,
  calculatePercentage,
  capitalizeFirstLetter,
  validateString,
  parseArray,
  sanitizeInput,
  calculateAge,
  emailExists,
  sortByProperty,
  getUniqueValues,
  filterByMultiple,
  formatDate,
  formatDateTime,
  daysDifference,
  paginate,
  logWithTimestamp,
  objectToQueryString,
  mergeObjects
};
