// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Middleware to ensure only admins can access these routes
router.use(protect, authorizeRoles('admin'));

// @route   GET /api/admin/users
// @desc    Get all users (with optional role filter)
// @access  Private/Admin
router.get('/users', async (req, res) => {
    try {
        const { role } = req.query;
        let query = {};
        if (role) {
            query.role = role;
        }
        const users = await User.find(query).select('-password'); // Exclude passwords
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// @route   PUT /api/admin/users/:id/approve-teacher
// @desc    Approve a pending teacher
// @access  Private/Admin
router.put('/users/:id/approve-teacher', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'pending_teacher') {
            return res.status(400).json({ message: 'User is not a pending teacher' });
        }

        user.role = 'teacher';
        await user.save();
        res.json({ message: 'Teacher approved successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// @route   PUT /api/admin/users/:id/change-role
// @desc    Change a user's role (admin can change to student/teacher/admin)
// @access  Private/Admin
router.put('/users/:id/change-role', async (req, res) => {
    const { newRole } = req.body;
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Admins cannot change their own role or other admins' roles to non-admin without specific logic
        if (user._id.toString() === req.user._id.toString() && newRole !== 'admin') {
            return res.status(403).json({ message: 'Admin cannot demote their own account via this endpoint' });
        }
        if (user.role === 'admin' && newRole !== 'admin' && user._id.toString() !== req.user._id.toString()) {
             return res.status(403).json({ message: 'Cannot demote another admin via this endpoint' });
        }

        if (!['student', 'teacher', 'admin', 'pending_teacher'].includes(newRole)) {
            return res.status(400).json({ message: 'Invalid new role provided' });
        }

        user.role = newRole;
        await user.save();
        res.json({ message: 'User role updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});


// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
// @access  Private/Admin
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from deleting themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(403).json({ message: 'Admin cannot delete their own account' });
        }

        await User.deleteOne({ _id: req.params.id });
        // Optionally, also delete related quizzes and quiz results
        await Quiz.deleteMany({ createdBy: req.params.id });
        await QuizResult.deleteMany({ user: req.params.id });

        res.json({ message: 'User and related data removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// @route   GET /api/admin/stats
// @desc    Get platform statistics
// @access  Private/Admin
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalTeachers = await User.countDocuments({ role: 'teacher' });
        const totalPendingTeachers = await User.countDocuments({ role: 'pending_teacher' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const totalQuizzes = await Quiz.countDocuments();
        const totalQuizResults = await QuizResult.countDocuments();

        res.json({
            totalUsers,
            totalStudents,
            totalTeachers,
            totalPendingTeachers,
            totalAdmins,
            totalQuizzes,
            totalQuizResults,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});


module.exports = router;