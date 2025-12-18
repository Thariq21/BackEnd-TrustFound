import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: './config/config.env' });

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Add user info to request (without password)
            // Note: decoded usually contains { id: ..., role: ..., iat: ..., exp: ... }
            req.user = decoded; 

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ status: 'error', message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ status: 'error', message: 'Not authorized, no token' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'satpam')) {
        next();
    } else {
        res.status(403).json({ status: 'error', message: 'Not authorized as an admin' });
    }
};

export { protect, adminOnly };