# EduQuiz

<p align="center">
  <img src="https://img.shields.io/badge/Stack-Node.js%20%7C%20Express%20%7C%20MongoDB-green?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/Release-v1.0.0-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge" />
</p>


An interactive quiz platform for educational purposes. Built with a modern backend and a responsive frontend.

## 🚀 Features

- User authentication (signup/login)
- Admin panel for quiz management
- Create, edit, and delete quizzes
- Take quizzes with real-time feedback
- View results and track performance
- Responsive design for mobile and desktop

## 🛠️ Tech Stack

**Frontend:**
- HTML5 / CSS3 / JavaScript

**Backend:**
- Node.js
- Express.js
- MongoDB (via Mongoose)

**Authentication:**
- JWT (JSON Web Tokens)

## 🧑‍💻 Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance like MongoDB Atlas)

### Backend Setup

1. Clone the repository:
   bash
   git clone https://github.com/mt-abdullah/EduQuiz.git
   cd EduQuiz/backend

2. Install dependencies:
   bash
   npm install

3. Create a `.env` file in the `backend` folder:
   env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   
4. Start the backend server:
   bash
   npm start
   The server will run at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend folder:
   bash
   cd ../frontend

2. Install dependencies (if any):
   bash
   npm install

3. Open `index.html` directly in your browser or serve it via a local dev server.

## 🔗 API Endpoints (Sample)

| Method | Endpoint           | Description               |
|--------|--------------------|---------------------------|
| POST   | /api/auth/register | User registration         |
| POST   | /api/auth/login    | User login                |
| GET    | /api/quizzes       | Get all quizzes           |
| POST   | /api/quizzes       | Create a new quiz (admin) |
| POST   | /api/results       | Submit quiz results       |

## ✅ To-Do / Future Improvements

- Add more question types (true/false, multiple select)
- Leaderboard for each quiz
- Quiz timer functionality
- Export results as CSV/PDF
- Dark mode UI

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Abdullah (mt-abdullah)**  
- System Administrator & Developer  
- [GitHub](https://github.com/mt-abdullah)  
- [LinkedIn](https://www.linkedin.com/in/mt-abdullah/)

