// backend/models/Question.js
const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true,
    },
    questionType: { // e.g., 'MCQ', 'True/False', 'ShortAnswer'
        type: String,
        enum: ['MCQ', 'True/False', 'ShortAnswer'],
        required: true,
    },
    options: { // For MCQ, True/False
        type: [String],
        default: [],
    },
    correctAnswer: { // Stores the correct option for MCQ/TF or expected text for ShortAnswer
        type: String,
        required: true,
    },
    explanation: {
        type: String,
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Easy',
    },
    points: { // Points awarded for correctly answering this question
        type: Number,
        default: 1,
    }
});

module.exports = QuestionSchema; // Export as a sub-schema