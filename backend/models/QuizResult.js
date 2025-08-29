// backend/models/QuizResult.js
const mongoose = require('mongoose');

const QuizResultSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
    },
    score: { // Total points scored by the user in this quiz
        type: Number,
        required: true,
        default: 0,
    },
    totalQuestions: { // Total number of questions in the quiz when attempted
        type: Number,
        required: true,
        default: 0,
    },
    correctAnswers: { // Count of correctly answered questions
        type: Number,
        required: true,
        default: 0,
    },
    answeredQuestions: [{ // Details for each question answered
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        userAnswer: { // User's submitted answer
            type: String,
        },
        isCorrect: {
            type: Boolean,
            required: true,
        },
        pointsAwarded: { // Points awarded for this specific question
            type: Number,
            default: 0,
        },
        // Optionally add original question text/options here for historical accuracy if quiz changes
    }],
    attemptedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('QuizResult', QuizResultSchema);