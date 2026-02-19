const jwt = require('jsonwebtoken');

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid token',
      message: error.message
    });
  }
};

// Generate JWT token
const generateToken = (userId, email) => {
  try {
    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    return null;
  }
};

module.exports = {
  verifyToken,
  generateToken
};
