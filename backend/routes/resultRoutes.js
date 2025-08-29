// backend/routes/resultRoutes.js
const express = require('express');
const router = express.Router();
const QuizResult = require('../models/QuizResult');
const Quiz = require('../models/Quiz');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// --- Specific Routes First ---

// @route   POST /api/results/submit/:quizId
// @desc    Submit a quiz attempt (Student only)
// @access  Private/Student
router.post('/submit/:quizId', protect, authorizeRoles('student'), async (req, res) => {
    const { answers } = req.body; // answers is an array: [{ questionId: '...', userAnswer: '...' }]
    const quizId = req.params.quizId;
    const userId = req.user._id;

    if (!Array.isArray(answers)) {
        return res.status(400).json({ message: 'Answers must be an array.' });
    }

    try {
        // Fetch quiz with questions to calculate score
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        let score = 0;
        let correctAnswersCount = 0;
        const answeredQuestions = [];
        // totalPossibleQuizScore will be calculated by the virtual in the populated object later
        // or by reducing quiz.questions directly if needed before saving result.

        for (const submittedAnswer of answers) {
            const question = quiz.questions.id(submittedAnswer.questionId); // Mongoose subdocument .id() method
            if (question) {
                // Normalize answers for comparison (e.g., trim whitespace, convert to lowercase)
                const userAnswerNormalized = String(submittedAnswer.userAnswer || '').trim().toLowerCase();
                const correctAnswerNormalized = String(question.correctAnswer || '').trim().toLowerCase();

                const isCorrect = userAnswerNormalized === correctAnswerNormalized;
                let pointsAwarded = 0;
                if (isCorrect) {
                    score += question.points;
                    correctAnswersCount++;
                    pointsAwarded = question.points;
                }
                answeredQuestions.push({
                    questionId: question._id,
                    userAnswer: submittedAnswer.userAnswer, // Store original user answer
                    isCorrect: isCorrect,
                    pointsAwarded: pointsAwarded,
                });
            }
        }

        const quizResult = new QuizResult({
            user: userId,
            quiz: quizId,
            score: score,
            totalQuestions: quiz.questions.length,
            correctAnswers: correctAnswersCount,
            answeredQuestions: answeredQuestions,
        });

        const createdResult = await quizResult.save();
        res.status(201).json(createdResult);
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});


// @route   GET /api/results/my-history
// @desc    Get all past quiz results for the logged-in user (Student only)
// @access  Private/Student
router.get('/my-history', protect, authorizeRoles('student'), async (req, res) => {
    try {
        // When populating 'quiz' to use 'totalPoints' virtual,
        // include the 'questions' field (or at least 'points') in the populate path.
        const results = await QuizResult.find({ user: req.user._id })
                                        .populate({
                                            path: 'quiz',
                                            select: 'title subject difficulty totalPoints targetGrade',
                                            populate: {
                                                path: 'questions',
                                                select: 'points'
                                            }
                                        })
                                        .sort({ attemptedAt: -1 });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// @route   GET /api/results/quiz/:quizId/all
// @desc    Get all results for a specific quiz (Teacher only, for their own quizzes)
// @access  Private/Teacher
router.get('/quiz/:quizId/all', protect, authorizeRoles('teacher'), async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz || quiz.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view results for this quiz' });
        }

        const results = await QuizResult.find({ quiz: req.params.quizId })
                                        .populate('user', 'username email')
                                        .populate({
                                            path: 'quiz',
                                            select: 'title subject difficulty totalPoints targetGrade',
                                            populate: {
                                                path: 'questions',
                                                select: 'points'
                                            }
                                        })
                                        .sort({ attemptedAt: -1 });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});


// --- Generic Parameterized Route Last ---

// @route   GET /api/results/:resultId
// @desc    Get a specific quiz result by ID (Student or Teacher/Admin for their context)
// @access  Private
router.get('/:resultId', protect, async (req, res) => {
    try {
        const result = await QuizResult.findById(req.params.resultId)
                                       .populate('user', 'username email')
                                       .populate({
                                            path: 'quiz',
                                            // For detailed results, we need all question info, including answers
                                            select: 'title subject description questions totalPoints targetGrade',
                                            populate: {
                                                path: 'questions'
                                            }
                                        });

        if (!result) {
            return res.status(404).json({ message: 'Quiz result not found' });
        }

        // Authorization check
        if (req.user.role === 'student' && result.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this student result' });
        }
        if (req.user.role === 'teacher' && result.quiz.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this quiz result' });
        }
        // Admins can see any result

        res.json(result);
    } catch (error) {
        // Handle specific CastError for invalid ObjectIds
        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({ message: 'Invalid result ID format' });
        }
        console.error("Error fetching detailed result:", error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

module.exports = router;