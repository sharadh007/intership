const jwt = require('jsonwebtoken');

const protectAdmin = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_change_me');

            if (decoded.role !== 'admin' && decoded.role !== 'superadmin' && decoded.role !== 'super_admin') {
                return res.status(403).json({ success: false, error: 'Not authorized as admin' });
            }

            req.user = decoded;
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Not authorized, no token' });
    }
};

module.exports = { protectAdmin };
