// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');

dotenv.config(); // Load environment variables
connectDB();     // Connect to MongoDB

const app = express();

// Middleware
app.use(express.json()); // Body parser for JSON
app.use(cors());         // Enable CORS

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/quizzes', require('./routes/quizRoutes'));
app.use('/api/results', require('./routes/resultRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Basic route for testing
app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));