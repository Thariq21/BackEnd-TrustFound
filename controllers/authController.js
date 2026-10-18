import User from '../models/mysql/userModel.js';
import Admin from '../models/mysql/adminModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { logActivity } from '../utils/logger.js'; 

dotenv.config({ path: './config/config.env' });

// Helper to generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '1h',
    });
};

const sessionResponse = (user, token, legacyData = {}) => ({
    status: 'success',
    user,
    token,
    data: { user, token, ...legacyData }
});

// @desc    Register new user (Mahasiswa)
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    const { nim, univ_id, full_name, email, phone_number, password } = req.body;

    try {
        const userExists = await User.findByNim(nim);
        if (userExists) return res.status(400).json({ status: 'error', message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            nim, univ_id, full_name, email, phone_number,
            password: hashedPassword, status: 'active'
        };

        await User.create(newUser);

        // --- LOG ACTIVITY ---
        logActivity(
            { id: nim, role: 'user', name: full_name },
            'REGISTER',
            { entity: 'User', entityId: nim, details: 'User registration' },
            req
        );
        // --------------------

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            token: generateToken(nim, 'user')
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    const { nim, password } = req.body;

    try {
        const user = await User.findByNim(nim);

        if (user && (await bcrypt.compare(password, user.password))) {
            if (user.status !== 'active') {
                return res.status(403).json({ status: 'error', message: 'This account is not active' });
            }

            logActivity(
                { id: user.nim, role: 'user', name: user.full_name },
                'LOGIN',
                { entity: 'User', entityId: user.nim, details: 'User logged in' },
                req
            );

            const token = generateToken(user.nim, 'user');
            const session = {
                id: String(user.nim),
                nim: String(user.nim),
                name: user.full_name,
                email: user.email,
                role: 'MAHASISWA'
            };
            return res.json({
                ...sessionResponse(session, token, {
                    nim: user.nim,
                    name: user.full_name,
                    email: user.email,
                    role: 'user'
                }),
                message: 'Login successful'
            });
        }

        const admin = await Admin.findByNip(nim);
        if (admin && (await bcrypt.compare(password, admin.password))) {
            logActivity(
                { id: admin.nip, role: admin.role, name: admin.full_name },
                'LOGIN',
                { entity: 'Admin', entityId: admin.nip, details: 'Admin logged in' },
                req
            );

            const token = generateToken(admin.nip, admin.role);
            const session = {
                id: String(admin.nip),
                nim: String(admin.nip),
                name: admin.full_name,
                email: admin.email,
                role: 'ADMIN_BEM'
            };
            return res.json({
                ...sessionResponse(session, token, {
                    nip: admin.nip,
                    name: admin.full_name,
                    role: admin.role
                }),
                message: 'Login successful'
            });
        }

        return res.status(401).json({ status: 'error', message: 'Invalid NIM or password' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// @desc    Login admin (Satpam/Staff)
// @route   POST /api/auth/admin/login
// @access  Public
export const loginAdmin = async (req, res) => {
    const { nip, password } = req.body;

    try {
        const admin = await Admin.findByNip(nip);

        if (admin && (await bcrypt.compare(password, admin.password))) {
            
            // --- LOG ACTIVITY ---
            logActivity(
                { id: admin.nip, role: admin.role, name: admin.full_name },
                'LOGIN',
                { entity: 'Admin', entityId: admin.nip, details: 'Admin logged in' },
                req
            );
            // --------------------

            const token = generateToken(admin.nip, admin.role);
            const session = {
                id: String(admin.nip),
                nim: String(admin.nip),
                name: admin.full_name,
                email: admin.email,
                role: 'ADMIN_BEM'
            };
            res.json({
                ...sessionResponse(session, token, {
                    nip: admin.nip,
                    name: admin.full_name,
                    role: admin.role
                }),
                message: 'Admin login successful'
            });
        } else {
            res.status(401).json({ status: 'error', message: 'Invalid NIP or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};