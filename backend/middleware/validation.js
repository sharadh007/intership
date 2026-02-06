// Email validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (Indian format)
const validatePhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/; // 10 digit Indian mobile number
  return phoneRegex.test(phone.toString());
};

// Age validation
const validateAge = (age) => {
  const ageNum = parseInt(age);
  return ageNum >= 18 && ageNum <= 65;
};

// Student registration validation middleware
const validateStudentRegistration = (req, res, next) => {
  try {
    const { name, email, phone, age, qualification } = req.body;

    // Check required fields
    if (!name || !email || !phone || !age || !qualification) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'email', 'phone', 'age', 'qualification']
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        example: 'user@example.com'
      });
    }

    // Validate phone format
    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        message: 'Phone must be 10 digits starting with 6-9'
      });
    }

    // Validate age
    if (!validateAge(age)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid age',
        message: 'Age must be between 18 and 65'
      });
    }

    // Validate name length
    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid name',
        message: 'Name must be at least 2 characters long'
      });
    }

    // Validate qualification
    const validQualifications = [
      '10th Pass',
      '12th Pass',
      'ITI',
      'Diploma',
      'Bachelor\'s Degree',
      'Master\'s Degree'
    ];

    if (!validQualifications.some(q => q.toLowerCase() === qualification.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid qualification',
        validOptions: validQualifications
      });
    }

    next();

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Validation error',
      message: error.message
    });
  }
};

// Recommendation request validation middleware
const validateRecommendationRequest = (req, res, next) => {
  try {
    const { name, age, qualification, skills, preferredState } = req.body;

    // Check required fields
    if (!name || !age || !qualification || !skills || !preferredState) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'age', 'qualification', 'skills', 'preferredState']
      });
    }

    // Validate age
    if (!validateAge(age)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid age',
        message: 'Age must be between 18 and 65'
      });
    }

    // Validate skills (must be array or string)
    if (!Array.isArray(skills) && typeof skills !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid skills format',
        message: 'Skills must be an array or string'
      });
    }

    // Validate skills not empty
    const skillsArray = Array.isArray(skills) ? skills : [skills];
    if (skillsArray.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one skill is required'
      });
    }

    next();

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Validation error',
      message: error.message
    });
  }
};

// Application submission validation middleware
const validateApplicationSubmission = (req, res, next) => {
  try {
    const { studentId, internshipId } = req.body;

    // Check required fields
    if (!studentId || !internshipId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['studentId', 'internshipId']
      });
    }

    // Validate ID formats (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid studentId format'
      });
    }

    // internshipId can be numeric or string
    if (!internshipId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid internshipId'
      });
    }

    next();

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Validation error',
      message: error.message
    });
  }
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    timestamp: new Date()
  });
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
};

module.exports = {
  validateEmail,
  validatePhone,
  validateAge,
  validateStudentRegistration,
  validateRecommendationRequest,
  validateApplicationSubmission,
  errorHandler,
  requestLogger
};
