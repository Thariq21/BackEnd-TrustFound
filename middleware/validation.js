import { body, validationResult } from 'express-validator';

// Fungsi utama untuk mengecek hasil validasi
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Validation failed',
            errors: errors.array() 
        });
    }
    next();
};

// Rules untuk Register User
const registerValidation = [
    body('nim').notEmpty().withMessage('NIM is required').isNumeric().withMessage('NIM must be numeric'),
    body('full_name').notEmpty().withMessage('Full Name is required').trim().escape(),
    body('email').isEmail().withMessage('Must be a valid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone_number').notEmpty().isMobilePhone().withMessage('Invalid phone number')
];

// Rules untuk Lapor Barang (Item)
// .escape() digunakan untuk membersihkan karakter HTML berbahaya (mencegah XSS)
const itemValidation = [
    body('name').notEmpty().withMessage('Item name is required').trim().escape(),
    body('description').notEmpty().withMessage('Description is required').trim().escape(),
    body('found_location').notEmpty().withMessage('Found location is required').trim().escape(),
    body('category_id').notEmpty().isNumeric(),
    body('found_date').isDate().withMessage('Invalid date format (YYYY-MM-DD)')
];

// Rules untuk Klaim Barang
const claimValidation = [
    // body('item_id').notEmpty().isNumeric(),
    body('challange_answer').notEmpty().withMessage('Answer is required').trim().escape()
];

export { 
    validate, 
    registerValidation, 
    itemValidation, 
    claimValidation 
};