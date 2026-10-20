import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: './config/config.env' });

const protect = async (req, res, next) => {
    const authorization = req.headers.authorization || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        return res.status(401).json({ status: 'error', message: 'Not authorized, no token' });
    }

    try {
        req.user = jwt.verify(match[1], process.env.JWT_SECRET);
        return next();
    } catch (error) {
        console.error('Bearer token verification failed:', error.message);
        return res.status(401).json({ status: 'error', message: 'Not authorized, token failed' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && ['Admin_BEM', 'ADMIN_BEM'].includes(req.user.role)) {
        return next();
    }
    return res.status(403).json({ status: 'error', message: 'Not authorized as an admin' });
};

export { protect, adminOnly };