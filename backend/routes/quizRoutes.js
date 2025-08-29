// backend/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz'); // Quiz model is imported here
const QuizResult = require('../models/QuizResult');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// @route   POST /api/quizzes
// @desc    Create a new quiz (Teacher only)
// @access  Private/Teacher
router.post('/', protect, authorizeRoles('teacher'), async (req, res) => {
    const { title, description, subject, category, difficulty, duration, questions, targetGrade } = req.body;

    // MODIFIED: Explicitly validate targetGrade here (business logic validation)
    if (!title || !subject || !duration || !questions || questions.length === 0 || !targetGrade) {
        return res.status(400).json({ message: 'Please provide title, subject, duration, target grade, and at least one question.' });
    }
    if (!Array.isArray(questions) || questions.some(q => !q.questionText || !q.questionType || !q.correctAnswer)) {
        return res.status(400).json({ message: 'Each question must have text, type, and a correct answer.' });
    }

    try {
        const quiz = new Quiz({
            title,
            description,
            subject,
            category,
            difficulty,
            duration,
            questions,
            targetGrade, // Now correctly passed
            createdBy: req.user._id,
        });

        const createdQuiz = await quiz.save();
        res.status(201).json(createdQuiz);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// @route   GET /api/quizzes
// @desc    Get all quizzes (Students see grade-specific, Teachers see their own, Admins see all)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let quizzes;
        if (req.user.role === 'teacher') {
            // Teachers see their own quizzes, with all details including answers
            quizzes = await Quiz.find({ createdBy: req.user._id }).populate('createdBy', 'username');
        } else if (req.user.role === 'student') {
            // Students see quizzes specifically for their grade
            quizzes = await Quiz.find({ targetGrade: req.user.gradeClass })
                                .select('-questions.correctAnswer -questions.explanation')
                                .populate('createdBy', 'username');
        } else if (req.user.role === 'admin') {
            // Admins see all quizzes
            quizzes = await Quiz.find()
                                .select('-questions.correctAnswer -questions.explanation')
                                .populate('createdBy', 'username');
        }
        else {
            return res.status(403).json({ message: 'Not authorized to view quizzes.' });
        }
        res.json(quizzes);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// @route   GET /api/quizzes/:id
// @desc    Get single quiz by ID (Students get quiz without answers, Teachers get full quiz, Admins get full quiz)
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        let quiz;
        if (req.user.role === 'teacher') {
            quiz = await Quiz.findById(req.params.id);
            if (!quiz) {
                return res.status(404).json({ message: 'Quiz not found' });
            }
            // Ensure teacher can only access their own quizzes
            if (quiz.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to view this quiz' });
            }
        } else if (req.user.role === 'student') {
            // Students can only view quizzes for their grade
            quiz = await Quiz.findOne({ _id: req.params.id, targetGrade: req.user.gradeClass }).select('-questions.correctAnswer -questions.explanation');
        } else if (req.user.role === 'admin') {
             // Admins can view any quiz, with full details
             quiz = await Quiz.findById(req.params.id);
        }
        else {
            return res.status(403).json({ message: 'Not authorized to view quizzes.' });
        }


        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found or not available for your role/grade.' });
        }

        res.json(quiz);
    } catch (error) {
        // Handle specific CastError for invalid ObjectIds
        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({ message: 'Invalid quiz ID format' });
        }
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// @route   PUT /api/quizzes/:id
// @desc    Update a quiz (Teacher only, only their own quizzes)
// @access  Private/Teacher
router.put('/:id', protect, authorizeRoles('teacher'), async (req, res) => {
    const { title, description, subject, category, difficulty, duration, questions, targetGrade } = req.body;

    // MODIFIED: Explicitly validate targetGrade here
    if (!title || !subject || !duration || !questions || questions.length === 0 || !targetGrade) {
        return res.status(400).json({ message: 'Please provide title, subject, duration, target grade, and at least one question.' });
    }

    try {
        let quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Ensure teacher can only update their own quizzes
        if (quiz.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this quiz' });
        }

        quiz.title = title || quiz.title;
        quiz.description = description || quiz.description;
        quiz.subject = subject || quiz.subject;
        quiz.category = category || quiz.category;
        quiz.difficulty = difficulty || quiz.difficulty;
        quiz.duration = duration || quiz.duration;
        quiz.questions = questions || quiz.questions; // For complex question updates, might need more specific logic
        quiz.targetGrade = targetGrade || quiz.targetGrade;

        const updatedQuiz = await quiz.save();
        res.json(updatedQuiz);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// @route   DELETE /api/quizzes/:id
// @desc    Delete a quiz (Teacher only, only their own quizzes)
// @access  Private/Teacher
router.delete('/:id', protect, authorizeRoles('teacher'), async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Ensure teacher can only delete their own quizzes
        if (quiz.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this quiz' });
        }

        await Quiz.deleteOne({ _id: req.params.id });
        // Also delete all associated quiz results
        await QuizResult.deleteMany({ quiz: req.params.id });

        res.json({ message: 'Quiz and all associated results removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

module.exports = router;