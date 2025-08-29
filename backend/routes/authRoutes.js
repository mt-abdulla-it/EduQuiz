// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // CORRECT: Only User model imported here
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');
require('dotenv').config();

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token expires in 1 hour
    });
};

// --- Helper for Password Strength Validation ---
const isStrongPassword = (password) => {
    // Minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return regex.test(password);
};
// --- End Helper ---

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    const { username, email, password, confirmPassword, firstName, lastName, schoolName, gradeClass, dateOfBirth, role } = req.body;

    // --- Server-side Validation (only for User model fields) ---
    if (!username || !email || !password || !confirmPassword || !firstName || !lastName || !schoolName || !gradeClass || !dateOfBirth) {
        return res.status(400).json({ message: 'Please fill in all required fields.' });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
    }
    if (!isStrongPassword(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one number.' });
    }

    // Validate email format (already in Mongoose schema, but good to have explicit here)
    if (!/.+@.+\..+/.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    // Validate Date of Birth (must be a valid date, not in the future, and indicate student age)
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) { // Check if date is valid
        return res.status(400).json({ message: 'Invalid Date of Birth.' });
    }
    if (dob > new Date()) { // Cannot be in the future
        return res.status(400).json({ message: 'Date of Birth cannot be in the future.' });
    }
    // Optional: Add an age check, e.g., minimum age for a student
    const minAgeDate = new Date();
    minAgeDate.setFullYear(minAgeDate.getFullYear() - 5); // Example: min 5 years old
    if (dob > minAgeDate) {
        return res.status(400).json({ message: 'User must be at least 5 years old.' });
    }
    // Optional: Max age for a student (e.g., 20 years old)
    const maxAgeDate = new Date();
    maxAgeDate.setFullYear(maxAgeDate.getFullYear() - 20); // Example: max 20 years old
    if (dob < maxAgeDate) {
        return res.status(400).json({ message: 'User cannot be older than 20 years old to register as a student/teacher.' });
    }
    // --- End Validation ---

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Username is already taken.' });
        }

        let newUserRole = 'student'; // Default role
        if (role === 'teacher') {
            newUserRole = 'pending_teacher'; // Teachers need approval
        } else if (role === 'admin') {
            return res.status(403).json({ message: 'Admin role cannot be set via public registration.' });
        }

        user = await User.create({
            username,
            email,
            password,
            firstName,
            lastName,
            schoolName,
            gradeClass,
            dateOfBirth: dob, // Use validated Date object
            role: newUserRole,
        });

        if (user) {
            if (user.role === 'pending_teacher') {
                 res.status(201).json({ message: 'Registration successful! Your teacher account is pending admin approval. Please wait for an admin to approve your account before logging in.' });
            } else {
                res.status(201).json({
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    schoolName: user.schoolName,
                    gradeClass: user.gradeClass,
                    dateOfBirth: user.dateOfBirth,
                    role: user.role,
                    token: generateToken(user._id),
                });
            }
        } else {
            res.status(400).json({ message: 'Invalid user data provided during registration.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error during registration: ' + error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (Login with Email OR Username)
// @access  Public
router.post('/login', async (req, res) => {
    const { loginIdentifier, password } = req.body; // 'loginIdentifier' can be email or username

    if (!loginIdentifier || !password) {
        return res.status(400).json({ message: 'Please enter your email/username and password.' });
    }

    try {
        let user;
        // Check if loginIdentifier looks like an email
        if (loginIdentifier.includes('@')) {
            user = await User.findOne({ email: loginIdentifier });
        } else {
            // Assume it's a username
            user = await User.findOne({ username: loginIdentifier });
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid email/username or password.' });
        }

        if (!(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email/username or password.' });
        }

        if (user.role === 'pending_teacher') {
            return res.status(403).json({ message: 'Your teacher account is pending approval.' });
        }

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            schoolName: user.schoolName,
            gradeClass: user.gradeClass,
            dateOfBirth: user.dateOfBirth,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login: ' + error.message });
    }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    if (req.user) {
        res.json({
            _id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            schoolName: req.user.schoolName,
            gradeClass: req.user.gradeClass,
            dateOfBirth: req.user.dateOfBirth,
            role: req.user.role,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

module.exports = router;