// backend/models/Quiz.js
const mongoose = require('mongoose');
const QuestionSchema = require('./Question');

const QuizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    category: { // e.g., Algebra, Biology
        type: String,
        trim: true,
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium',
    },
    questions: [QuestionSchema], // Array of embedded question documents
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    duration: { // in minutes
        type: Number,
        default: 30,
        min: 1,
    },
    targetGrade: { // MODIFIED: Make optional at schema level, validated in routes.
        type: String,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Virtual for total points in a quiz
QuizSchema.virtual('totalPoints').get(function() {
    // Ensure questions array exists before reducing
    return this.questions ? this.questions.reduce((sum, question) => sum + (question.points || 0), 0) : 0;
});

QuizSchema.set('toObject', { virtuals: true });
QuizSchema.set('toJSON', { virtuals: true });

// Check if model already exists before compiling it
module.exports = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);