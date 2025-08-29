// frontend/script.js
const API_BASE_URL = "https://eduquiz-fyxf.onrender.com//api"; // Ensure this matches your backend port

const appContainer = document.getElementById("app-container");
const navDashboard = document.getElementById("nav-dashboard");
const navCreateQuiz = document.getElementById("nav-create-quiz");
const navLogout = document.getElementById("nav-logout");
const navLoginRegister = document.getElementById("nav-login-register");

let currentUser = null;
let userToken = null;
let quizTimerInterval; // Declare globally for proper clearing
let quizInProgressQuizId = null; // Store ID of quiz currently being taken

// --- Utility Functions ---

// Function to show/hide loading spinner
function showLoadingSpinner() {
  const spinnerOverlay = document.createElement("div");
  spinnerOverlay.className = "loading-spinner-overlay";
  spinnerOverlay.innerHTML = '<div class="loading-spinner"></div>';
  document.body.appendChild(spinnerOverlay);
}

function hideLoadingSpinner() {
  const spinnerOverlay = document.querySelector(".loading-spinner-overlay");
  if (spinnerOverlay) {
    spinnerOverlay.remove();
  }
}

// Function to display messages to the user
function showMessage(type, text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  // Remove any existing messages before prepending the new one
  const existingMessage = appContainer.querySelector(".message");
  if (existingMessage) {
    existingMessage.remove();
  }
  appContainer.prepend(messageDiv);
  setTimeout(() => messageDiv.remove(), 5000); // Message disappears after 5 seconds
}

// Updates navigation visibility based on login status and user role
function updateNav() {
  userToken = localStorage.getItem("token");
  if (userToken) {
    navLoginRegister.classList.add("hidden");
    navLogout.classList.remove("hidden");
    navDashboard.classList.remove("hidden");

    // Show/hide based on user role
    if (currentUser && currentUser.role === "teacher") {
      navCreateQuiz.classList.remove("hidden");
    } else if (currentUser && currentUser.role === "admin") {
      navCreateQuiz.classList.add("hidden"); // Admins typically don't create quizzes directly
    } else {
      // Student or Pending Teacher
      navCreateQuiz.classList.add("hidden");
    }
  } else {
    navLoginRegister.classList.remove("hidden");
    navLogout.classList.add("hidden");
    navDashboard.classList.add("hidden");
    navCreateQuiz.classList.add("hidden");
  }
}

// Fetches user profile to update current user details and navigation
async function fetchUserProfile() {
  if (!userToken) {
    currentUser = null;
    updateNav();
    return;
  }
  showLoadingSpinner();
  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });
    if (response.ok) {
      currentUser = await response.json();
      updateNav();
    } else {
      console.error("Failed to fetch user profile:", await response.json());
      localStorage.removeItem("token"); // Invalid token, remove it
      currentUser = null;
      updateNav();
      showMessage("error", "Session expired or invalid. Please log in again.");
      renderAuthPage(false); // Redirect to login if token is invalid
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    localStorage.removeItem("token");
    currentUser = null;
    updateNav();
    showMessage(
      "error",
      "Network error or unable to connect to server. Please try again."
    );
    renderAuthPage(false); // Redirect to login
  } finally {
    hideLoadingSpinner();
  }
}

// --- Render Functions ---

// NEW: Single Auth Page function for both Login and Register
function renderAuthPage(isRegisterMode = false) {
    // Calculate min and max dates for date of birth (e.g., students between 5 and 20 years old)
    const today = new Date();
    const maxDateAllowed = new Date(today);
    maxDateAllowed.setFullYear(today.getFullYear() - 5); // Minimum 5 years old
    const minDateAllowed = new Date(today);
    minDateAllowed.setFullYear(today.getFullYear() - 20); // Maximum 20 years old

    const formatDate = (date) => date.toISOString().split('T')[0];
    const gradeOptions = Array.from({length: 13}, (_, i) => `Grade ${i + 1}`);


    appContainer.innerHTML = `
        <div class="auth-page-wrapper">
            <div class="auth-left-pane">
                <div class="auth-left-content">
                    <h1>EduQuiz Platform</h1>
                    <p>Learn, Test, Excel.</p>
                </div>
            </div>
            <div class="auth-right-pane">
                <div class="auth-form-switcher">
                    <button id="show-login-form" class="${!isRegisterMode ? 'active' : ''}">Login</button>
                    <button id="show-register-form" class="${isRegisterMode ? 'active' : ''}">Register</button>
                </div>

                <div id="login-form-container" class="${isRegisterMode ? 'hidden' : ''}">
                    <h2>Welcome Back!</h2>
                    <p class="auth-intro-text">Please log in to continue.</p>
                    <form id="login-form" class="auth-form">
                        <h3>Login</h3>
                        <div class="form-group">
                            <label for="login-identifier">Email or Username:</label>
                            <input type="text" id="login-identifier" required autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label for="login-password">Password:</label>
                            <input type="password" id="login-password" required autocomplete="current-password">
                        </div>
                        <button type="submit" class="action-button">Login</button>
                    </form>
                </div>

                <div id="register-form-container" class="${!isRegisterMode ? 'hidden' : ''}">
                    <h2>Create Your Account</h2>
                    <p class="auth-intro-text">Join us to access interactive quizzes and track your progress.</p>
                    <form id="register-form" class="auth-form">
                        <h3>Registration Details</h3>
                        <div class="form-group">
                            <label for="register-firstName">First Name:</label>
                            <input type="text" id="register-firstName" required autocomplete="given-name">
                        </div>
                        <div class="form-group">
                            <label for="register-lastName">Last Name:</label>
                            <input type="text" id="register-lastName" required autocomplete="family-name">
                        </div>
                        <div class="form-group">
                            <label for="register-email">Email Address:</label>
                            <input type="email" id="register-email" required autocomplete="email">
                        </div>
                        <div class="form-group">
                            <label for="register-username">Username:</label>
                            <input type="text" id="register-username" required autocomplete="off">
                            <small id="username-feedback" class="form-text-feedback"></small>
                        </div>
                        <div class="form-group">
                            <label for="register-password">Password:</label>
                            <input type="password" id="register-password" required autocomplete="new-password">
                            <small id="password-strength-feedback" class="form-text-feedback">Min. 8 chars, upper & lower case, number.</small>
                        </div>
                        <div class="form-group">
                            <label for="register-confirmPassword">Confirm Password:</label>
                            <input type="password" id="register-confirmPassword" required autocomplete="new-password">
                        </div>
                        <div class="form-group">
                            <label for="register-schoolName">School Name:</label>
                            <input type="text" id="register-schoolName" required list="school-suggestions" placeholder="e.g., Central High School">
                            <datalist id="school-suggestions">
                                <option value="Central High School"></option>
                                <option value="Maplewood Academy"></option>
                                <option value="Oakridge Secondary School"></option>
                            </datalist>
                        </div>
                        <div class="form-group">
                            <label for="register-gradeClass">Grade:</label>
                            <select id="register-gradeClass" required>
                                <option value="">Select Grade</option>
                                ${gradeOptions.map(grade => `<option value="${grade}">${grade}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="register-dateOfBirth">Date of Birth:</label>
                            <input type="date" id="register-dateOfBirth" required
                                   min="${formatDate(minDateAllowed)}" max="${formatDate(maxDateAllowed)}">
                        </div>
                        <div class="form-group">
                            <label for="register-role">Register as:</label>
                            <select id="register-role">
                                <option value="student">Student</option>
                                <option value="teacher">Teacher (requires admin approval)</option>
                            </select>
                        </div>
                        <button type="submit" class="action-button">Register Account</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Event listeners for the switcher buttons
    document.getElementById('show-login-form').addEventListener('click', () => {
        document.getElementById('login-form-container').classList.remove('hidden');
        document.getElementById('register-form-container').classList.add('hidden');
        document.getElementById('show-login-form').classList.add('active');
        document.getElementById('show-register-form').classList.remove('active');
    });

    document.getElementById('show-register-form').addEventListener('click', () => {
        document.getElementById('register-form-container').classList.remove('hidden');
        document.getElementById('login-form-container').classList.add('hidden');
        document.getElementById('show-register-form').classList.add('active');
        document.getElementById('show-login-form').classList.remove('active');
    });

    // Event listeners for Auth Forms (Login)
    document
        .getElementById("login-form")
        .addEventListener("submit", async (e) => {
            e.preventDefault();
            const loginIdentifier = document.getElementById("login-identifier").value;
            const password = document.getElementById("login-password").value;

            showLoadingSpinner();
            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ loginIdentifier, password }),
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem("token", data.token);
                    showMessage("success", "Logged in successfully!");
                    await fetchUserProfile();
                    if (currentUser && currentUser.role === "admin") {
                        renderAdminDashboard();
                    } else if (currentUser && currentUser.role === "pending_teacher") {
                        appContainer.innerHTML = `
                            <h2>Teacher Account Pending</h2>
                            <p class="message warning">Your teacher account is pending approval from an administrator. You will be able to access the teacher dashboard once approved.</p>
                            <p>If you believe this is an error or need faster approval, please contact an administrator.</p>
                            <button class="action-button" onclick="renderAuthPage(false)">Go to Login</button>
                        `;
                    } else {
                        renderDashboard();
                    }
                } else {
                    showMessage("error", data.message || "Login failed.");
                }
            } catch (error) {
                showMessage("error", "Network error. Could not connect to server.");
                console.error("Login error:", error);
            } finally {
                hideLoadingSpinner();
            }
        });

    // Event listeners for Auth Forms (Register)
    const registerUsernameInput = document.getElementById('register-username');
    const usernameFeedback = document.getElementById('username-feedback');
    let usernameTimeout;

    if (registerUsernameInput) { // Check if element exists for register form
        registerUsernameInput.addEventListener('input', () => {
            clearTimeout(usernameTimeout);
            const username = registerUsernameInput.value.trim();
            if (username.length < 3) {
                usernameFeedback.textContent = 'Username too short (min 3 chars)';
                usernameFeedback.className = 'form-text-feedback warning';
                return;
            }
            usernameFeedback.textContent = 'Checking availability...';
            usernameFeedback.className = 'form-text-feedback info';

            usernameTimeout = setTimeout(async () => {
                usernameFeedback.textContent = 'Username is available!';
                usernameFeedback.className = 'form-text-feedback success';
            }, 500);
        });
    }

    const registerPasswordInput = document.getElementById('register-password');
    const passwordStrengthFeedback = document.getElementById('password-strength-feedback');

    if (registerPasswordInput) { // Check if element exists for register form
        registerPasswordInput.addEventListener('input', () => {
            const password = registerPasswordInput.value;
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
            if (password.length < 8) {
                passwordStrengthFeedback.textContent = 'Password too short (min 8 chars)';
                passwordStrengthFeedback.className = 'form-text-feedback error';
            } else if (!passwordRegex.test(password)) {
                passwordStrengthFeedback.textContent = 'Must include upper & lower case, and a number.';
                passwordStrengthFeedback.className = 'form-text-feedback error';
            } else {
                passwordStrengthFeedback.textContent = 'Password is strong!';
                passwordStrengthFeedback.className = 'form-text-feedback success';
            }
        });
    }


    document
        .getElementById("register-form")
        .addEventListener("submit", async (e) => {
            e.preventDefault();
            const firstName = document.getElementById("register-firstName").value;
            const lastName = document.getElementById("register-lastName").value;
            const email = document.getElementById("register-email").value;
            const username = document.getElementById("register-username").value;
            const password = document.getElementById("register-password").value;
            const confirmPassword = document.getElementById("register-confirmPassword").value;
            const schoolName = document.getElementById("register-schoolName").value;
            const gradeClass = document.getElementById("register-gradeClass").value;
            const dateOfBirth = document.getElementById("register-dateOfBirth").value;
            const role = document.getElementById("register-role").value;

            // --- Client-side Validation (using showMessage) ---
            if (password !== confirmPassword) {
                showMessage("error", "Passwords do not match.");
                return;
            }
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
            if (!passwordRegex.test(password)) {
                showMessage("error", "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one number.");
                return;
            }
            if (!email.includes('@') || !email.includes('.')) {
                showMessage("error", "Please enter a valid email address.");
                return;
            }
            const dobDate = new Date(dateOfBirth);
            if (isNaN(dobDate.getTime()) || dobDate > maxDateAllowed || dobDate < minDateAllowed) {
                 showMessage("error", "Invalid Date of Birth. Please select a date indicating you are between 5 and 20 years old.");
                 return;
            }
            // --- End Client-side Validation ---


            showLoadingSpinner();
            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        email,
                        username,
                        password,
                        confirmPassword,
                        schoolName,
                        gradeClass,
                        dateOfBirth,
                        role
                    }),
                });
                const data = await response.json();
                if (response.ok) {
                    showMessage("success", data.message || "Registration successful! Please log in.");
                    renderAuthPage(false); // After successful registration, go to login page
                } else {
                    showMessage("error", data.message || "Registration failed.");
                }
            } catch (error) {
                showMessage("error", "Network error. Could not connect to server.");
                console.error("Register error:", error);
            } finally {
                hideLoadingSpinner();
            }
        });
}


async function renderDashboard() {
  if (!userToken) {
    renderAuthPage(false); // Redirect to login
    return;
  }
  await fetchUserProfile(); // Ensure currentUser is up-to-date

  if (!currentUser) return; // If profile fetching failed, user is redirected

  // Redirect admins to their specific dashboard
  if (currentUser.role === "admin") {
    renderAdminDashboard();
    return;
  }
  // Redirect pending teachers
  if (currentUser.role === "pending_teacher") {
    appContainer.innerHTML = `
            <h2>Teacher Account Pending Approval</h2>
            <p class="message warning">Your teacher account is currently pending approval from an administrator. You will gain full access to the teacher dashboard once approved.</p>
            <p>Thank you for your patience. If you have any questions, please contact support.</p>
        `;
    return;
  }

  appContainer.innerHTML = `
        <h2>Welcome, ${currentUser.firstName} ${currentUser.lastName}!</h2>
        <p>You are logged in as a <strong>${currentUser.role}</strong>.</p>
        <p>School: ${currentUser.schoolName} | Grade: ${currentUser.gradeClass}</p>
        <div id="dashboard-content"></div>
    `;
  const dashboardContent = document.getElementById("dashboard-content");

  if (currentUser.role === "student") {
    dashboardContent.innerHTML += `
            <h3>Available Quizzes for ${currentUser.gradeClass}</h3>
            <div id="quizzes-list" class="card-list">Loading quizzes...</div>
            <h3>My Past Results</h3>
            <div id="results-history" class="card-list">Loading results...</div>
        `;
    showLoadingSpinner();
    // Use Promise.all to fetch quizzes and results concurrently
    try {
        const [quizzesResponse, resultsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/quizzes`, { headers: { Authorization: `Bearer ${userToken}` } }),
            fetch(`${API_BASE_URL}/results/my-history`, { headers: { Authorization: `Bearer ${userToken}` } })
        ]);

        const quizzes = await quizzesResponse.json();
        const results = await resultsResponse.json();

        // Handle Quizzes
        const quizzesListDiv = document.getElementById("quizzes-list");
        if (quizzesResponse.ok) {
            quizzesListDiv.innerHTML = "";
            if (quizzes.length === 0) {
                quizzesListDiv.innerHTML = `<p>No quizzes available for your grade (${currentUser.gradeClass}) yet. Check back soon!</p>`;
            } else {
                quizzes.forEach((quiz) => {
                    const quizCard = document.createElement("div");
                    quizCard.className = "card";
                    quizCard.innerHTML = `
                                    <div class="card-content">
                                        <h4>${quiz.title}</h4>
                                        <p>Subject: ${quiz.subject} | Difficulty: ${
                        quiz.difficulty
                        } | Duration: ${quiz.duration} min</p>
                                        <p>${
                        quiz.description || "No description provided."
                        }</p>
                                    </div>
                                    <div class="card-actions">
                                        <button class="action-button" data-id="${
                        quiz._id
                        }">Start Quiz</button>
                                    </div>
                                `;
                    quizzesListDiv.appendChild(quizCard);
                });
                quizzesListDiv.querySelectorAll("button").forEach((button) => {
                    button.addEventListener("click", (e) =>
                    renderTakeQuiz(e.target.dataset.id)
                    );
                });
            }
        } else {
            showMessage("error", quizzes.message || "Failed to fetch quizzes.");
            quizzesListDiv.innerHTML = `<p class="message error">${quizzes.message || "Failed to load quizzes."}</p>`;
        }

        // Handle Results
        const resultsHistoryDiv = document.getElementById("results-history");
        if (resultsResponse.ok) {
            resultsHistoryDiv.innerHTML = "";
            if (results.length === 0) {
                resultsHistoryDiv.innerHTML = "<p>You have not attempted any quizzes yet.</p>";
            } else {
                results.forEach((result) => {
                    const resultCard = document.createElement("div");
                    resultCard.className = "card";
                    // Ensure result.quiz exists and has totalPoints
                    const quizTitle = result.quiz ? result.quiz.title : "Unknown Quiz";
                    const totalPossibleQuizScore = result.quiz ? result.quiz.totalPoints : result.totalQuestions * 1;
                    const percentage =
                        totalPossibleQuizScore > 0
                        ? ((result.score / totalPossibleQuizScore) * 100).toFixed(2)
                        : "N/A";

                    resultCard.innerHTML = `
                                    <div class="card-content">
                                        <h4>${quizTitle}</h4>
                                        <p>Score: <strong>${
                        result.score
                        }</strong> / ${totalPossibleQuizScore} (${percentage}%)</p>
                                        <p>Correct: <strong>${result.correctAnswers}</strong> / ${
                        result.totalQuestions
                        }</p>
                                        <p>Attempted: ${new Date(
                        result.attemptedAt
                        ).toLocaleString()}</p>
                                    </div>
                                    <div class="card-actions">
                                        <button class="action-button" data-id="${
                        result._id
                        }">View Details</button>
                                    </div>
                                `;
                    resultsHistoryDiv.appendChild(resultCard);
                });
                resultsHistoryDiv.querySelectorAll("button").forEach((button) => {
                    button.addEventListener("click", (e) =>
                    renderQuizResults(e.target.dataset.id)
                    );
                });
            }
        } else {
            showMessage(
                "error",
                results.message || "Failed to fetch results history."
            );
            resultsHistoryDiv.innerHTML = `<p class="message error">${results.message || "Failed to load results."}</p>`;
        }

    } catch (error) {
      showMessage("error", "Network error fetching dashboard data.");
      console.error("Error fetching dashboard data:", error);
      document.getElementById("quizzes-list").innerHTML = `<p class="message error">Network error loading quizzes.</p>`;
      document.getElementById("results-history").innerHTML = `<p class="message error">Network error loading results.</p>`;
    } finally {
      hideLoadingSpinner();
    }
  } else if (currentUser.role === "teacher") {
    dashboardContent.innerHTML += `
            <h3>My Created Quizzes</h3>
            <div id="my-quizzes-list" class="card-list">Loading quizzes...</div>
            <button id="go-to-create-quiz" class="action-button" style="margin-top: var(--spacing-md);">Create New Quiz</button>
        `;
    // FIX: Attach event listener AFTER the button is added to the DOM
    document.getElementById('go-to-create-quiz').addEventListener('click', () => renderCreateQuiz());


    showLoadingSpinner();
    try {
      const response = await fetch(`${API_BASE_URL}/quizzes`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const quizzes = await response.json();
      if (response.ok) {
        const myQuizzesListDiv = document.getElementById("my-quizzes-list");
        myQuizzesListDiv.innerHTML = "";
        if (quizzes.length === 0) {
          myQuizzesListDiv.innerHTML =
            "<p>You have not created any quizzes yet.</p>";
        } else {
          quizzes.forEach((quiz) => {
            const quizCard = document.createElement("div");
            quizCard.className = "card";
            quizCard.innerHTML = `
                            <div class="card-content">
                                <h4>${quiz.title} <span class="badge-grade">${quiz.targetGrade}</span></h4>
                                <p>Subject: ${quiz.subject} | Questions: ${
              quiz.questions.length
            } | Total Points: ${quiz.totalPoints}</p>
                                <p>${
                                  quiz.description || "No description provided."
                                }</p>
                            </div>
                            <div class="card-actions">
                                <button data-id="${
                                  quiz._id
                                }" class="edit-quiz-btn">Edit</button>
                                <button data-id="${
                                  quiz._id
                                }" class="delete-btn">Delete</button>
                                <button data-id="${
                                  quiz._id
                                }" class="view-results-btn">View Results</button>
                            </div>
                        `;
            myQuizzesListDiv.appendChild(quizCard);
          });
          myQuizzesListDiv
            .querySelectorAll(".edit-quiz-btn")
            .forEach((button) => {
              button.addEventListener("click", (e) =>
                renderCreateQuiz(e.target.dataset.id)
              ); // Reuse create for edit
            });
          myQuizzesListDiv.querySelectorAll(".delete-btn").forEach((button) => {
            button.addEventListener("click", async (e) => {
              if (
                confirm(
                  "Are you sure you want to delete this quiz? This will also delete all associated results."
                )
              ) {
                await deleteQuiz(e.target.dataset.id);
                renderDashboard(); // Refresh dashboard
              }
            });
          });
          myQuizzesListDiv
            .querySelectorAll(".view-results-btn")
            .forEach((button) => {
              button.addEventListener("click", (e) =>
                renderQuizResultsForTeacher(e.target.dataset.id)
              );
            });
        }
      } else {
        showMessage(
          "error",
          quizzes.message || "Failed to fetch your quizzes."
        );
        document.getElementById("my-quizzes-list").innerHTML = `<p class="message error">${quizzes.message || "Failed to load quizzes."}</p>`;
      }
    } catch (error) {
      showMessage("error", "Network error fetching your quizzes.");
      console.error("Error fetching teacher quizzes:", error);
      document.getElementById("my-quizzes-list").innerHTML = `<p class="message error">Network error loading quizzes.</p>`;
    } finally {
      hideLoadingSpinner();
    }
  }
}

async function deleteQuiz(quizId) {
  showLoadingSpinner();
  try {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (response.ok) {
      showMessage(
        "success",
        "Quiz and associated results deleted successfully!"
      );
    } else {
      const data = await response.json();
      showMessage("error", data.message || "Failed to delete quiz.");
    }
  } catch (error) {
    showMessage("error", "Network error during quiz deletion.");
    console.error("Delete quiz error:", error);
  } finally {
    hideLoadingSpinner();
  }
}

async function renderCreateQuiz(quizId = null) {
  if (!userToken || currentUser.role !== "teacher") {
    showMessage("error", "Unauthorized to create/edit quizzes.");
    renderDashboard();
    return;
  }

  let quizToEdit = null;
  showLoadingSpinner();
  if (quizId) {
    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (response.ok) {
        quizToEdit = await response.json();
      } else {
        showMessage("error", "Failed to load quiz for editing.");
        quizId = null; // Treat as new quiz if loading fails
      }
    } catch (error) {
      showMessage("error", "Network error loading quiz for editing.");
      console.error("Error loading quiz for edit:", error);
      quizId = null;
    }
  }
  hideLoadingSpinner();

  // Grade options - now including Grade 13 for quiz creation too
  const gradeOptions = Array.from({length: 13}, (_, i) => `Grade ${i + 1}`);


  appContainer.innerHTML = `
        <h2>${quizId ? "Edit Quiz" : "Create New Quiz"}</h2>
        <form id="quiz-form">
            <label for="quiz-title">Title:</label>
            <input type="text" id="quiz-title" value="${
              quizToEdit ? quizToEdit.title : ""
            }" required>

            <label for="quiz-description">Description:</label>
            <textarea id="quiz-description">${
              quizToEdit ? quizToEdit.description : ""
            }</textarea>

            <label for="quiz-subject">Subject:</label>
            <input type="text" id="quiz-subject" value="${
              quizToEdit ? quizToEdit.subject : ""
            }" required>

            <label for="quiz-category">Category:</label>
            <input type="text" id="quiz-category" value="${
              quizToEdit ? quizToEdit.category : ""
            }">

            <label for="quiz-difficulty">Difficulty:</label>
            <select id="quiz-difficulty">
                <option value="Easy" ${
                  quizToEdit && quizToEdit.difficulty === "Easy"
                    ? "selected"
                    : ""
                }>Easy</option>
                <option value="Medium" ${
                  quizToEdit && quizToEdit.difficulty === "Medium"
                    ? "selected"
                    : ""
                }>Medium</option>
                <option value="Hard" ${
                  quizToEdit && quizToEdit.difficulty === "Hard"
                    ? "selected"
                    : ""
                }>Hard</option>
            </select>

            <label for="quiz-duration">Duration (minutes):</label>
            <input type="number" id="quiz-duration" value="${
              quizToEdit ? quizToEdit.duration : 30
            }" min="1" required>

            <label for="quiz-targetGrade">Target Grade:</label>
            <select id="quiz-targetGrade" required>
                <option value="">Select Target Grade</option>
                ${gradeOptions.map(grade => `<option value="${grade}" ${quizToEdit && quizToEdit.targetGrade === grade ? 'selected' : ''}>${grade}</option>`).join('')}
            </select>

            <h3>Questions</h3>
            <div id="questions-container">
                <!-- Existing questions will be loaded here -->
            </div>
            <button type="button" id="add-question-btn" class="action-button" style="background-color: var(--secondary-color);">Add Question</button>

            <button type="submit" id="submit-quiz-form-btn" class="action-button">${
              quizId ? "Update Quiz" : "Create Quiz"
            }</button>
        </form>
    `;

  const questionsContainer = document.getElementById("questions-container");
  const addQuestionBtn = document.getElementById("add-question-btn");
  const quizForm = document.getElementById("quiz-form"); // Get reference to the form for submission

  let questions = quizToEdit ? quizToEdit.questions : [];

  function renderQuestions() {
    questionsContainer.innerHTML = "";
    questions.forEach((q, qIndex) => { // Renamed index to qIndex for clarity
      const questionDiv = document.createElement("div");
      questionDiv.className = "question-item";
      questionDiv.dataset.index = qIndex;
      questionDiv.innerHTML = `
                <h4>Question ${qIndex + 1}</h4>
                <label>Question Text:</label>
                <input type="text" class="question-text" value="${
                  q.questionText || ""
                }" required>

                <label>Question Type:</label>
                <select class="question-type">
                    <option value="MCQ" ${
                      q.questionType === "MCQ" ? "selected" : ""
                    }>MCQ</option>
                    <option value="True/False" ${
                      q.questionType === "True/False" ? "selected" : ""
                    }>True/False</option>
                    <option value="ShortAnswer" ${
                      q.questionType === "ShortAnswer" ? "selected" : ""
                    }>Short Answer</option>
                </select>

                <div class="options-container">
                    <!-- Dynamic options will be rendered here -->
                </div>

                <div class="correct-answer-input-group">
                    <label for="correct-answer-${qIndex}">Correct Answer:</label>
                    <!-- Input/Select for correct answer will be rendered dynamically -->
                </div>


                <label>Points:</label>
                <input type="number" class="question-points" value="${
                  q.points || 1
                }" min="1" required>

                <label>Explanation (Optional):</label>
                <textarea class="question-explanation">${
                  q.explanation || ""
                }</textarea>

                <button type="button" class="remove-question-btn action-button" style="background-color: #dc3545;">Remove Question</button>
                <hr>
            `;
      questionsContainer.appendChild(questionDiv);

      // --- Dynamic Event Listeners for Question Inputs ---
      questionDiv.querySelector('.question-text').addEventListener('input', (e) => {
          q.questionText = e.target.value;
      });
      questionDiv.querySelector('.question-points').addEventListener('input', (e) => {
          q.points = parseInt(e.target.value) || 0;
      });
      questionDiv.querySelector('.question-explanation').addEventListener('input', (e) => {
          q.explanation = e.target.value;
      });

      // --- Dynamic Option and Correct Answer Rendering Logic ---
      const optionsContainer = questionDiv.querySelector(".options-container");
      const questionTypeSelect = questionDiv.querySelector(".question-type");
      const correctAnswerInputGroup = questionDiv.querySelector(".correct-answer-input-group");

      function updateOptionsAndCorrectAnswerDisplay() {
          const currentQuestionType = questionTypeSelect.value;
          optionsContainer.innerHTML = ''; // Clear existing options
          correctAnswerInputGroup.innerHTML = `<label for="correct-answer-${qIndex}">Correct Answer:</label>`; // Reset correct answer group

          const isOptionBased = (currentQuestionType === 'MCQ' || currentQuestionType === 'True/False');
          const isTrueFalse = (currentQuestionType === 'True/False');

          if (isOptionBased) {
              optionsContainer.style.display = 'block';
              let optionsToRender = q.options;

              // Auto-set for True/False if not already set
              if (isTrueFalse) {
                  if (!Array.isArray(q.options) || q.options.length !== 2 || q.options[0].toLowerCase() !== 'true' || q.options[1].toLowerCase() !== 'false') {
                      q.options = ["True", "False"];
                  }
                  optionsToRender = q.options;
              }

              // Render options
              optionsToRender.forEach((optionText, optIndex) => {
                  const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C...
                  const optionInputDiv = document.createElement('div');
                  optionInputDiv.className = 'option-input-group';

                  optionInputDiv.innerHTML = `
                      <label>${optionLabel})</label>
                      <input type="text" class="question-option-text" value="${optionText}" required ${isTrueFalse ? 'readonly' : ''}>
                      ${!isTrueFalse ? `<button type="button" class="remove-option-btn action-button" style="background-color: var(--secondary-color); padding: 0.5rem 0.8rem; margin-top: 5px;">Remove</button>` : ''}
                  `;
                  optionsContainer.appendChild(optionInputDiv);

                  // Update option in model on input change (for MCQ only)
                  if (!isTrueFalse) {
                      optionInputDiv.querySelector('.question-option-text').addEventListener('input', (e) => {
                          q.options[optIndex] = e.target.value;
                          updateCorrectAnswerSelect(); // Re-render the correct answer dropdown to reflect option text changes
                      });
                  }

                  optionInputDiv.querySelector('.remove-option-btn')?.addEventListener('click', () => {
                      q.options.splice(optIndex, 1);
                      renderQuestions(); // Re-render all questions to update labels and correct answer dropdown
                  });
              });

              // Add option button for MCQ only
              if (!isTrueFalse) {
                  const addOptionButton = document.createElement('button');
                  addOptionButton.type = 'button';
                  addOptionButton.className = 'add-option-btn action-button';
                  addOptionButton.style = 'background-color: var(--primary-color); padding: 0.6rem 1rem; margin-top: 10px;';
                  addOptionButton.textContent = 'Add Option';
                  optionsContainer.appendChild(addOptionButton);

                  addOptionButton.addEventListener('click', () => {
                      q.options.push(''); // Add an empty option
                      renderQuestions(); // Re-render all questions to update labels and correct answer dropdown
                  });
              }

              // Function to render/update the Correct Answer SELECT dropdown
              function updateCorrectAnswerSelect() {
                let correctAnswerSelectHtml = `<select id="correct-answer-${qIndex}" class="correct-answer-select" required>`;
                correctAnswerSelectHtml += '<option value="">Select Correct Answer</option>';

                if (isTrueFalse) {
                    correctAnswerSelectHtml += `<option value="True" ${q.correctAnswer.toLowerCase() === 'true' ? 'selected' : ''}>True</option>`;
                    correctAnswerSelectHtml += `<option value="False" ${q.correctAnswer.toLowerCase() === 'false' ? 'selected' : ''}>False</option>`;
                } else { // MCQ
                    if (q.options.length > 0) {
                      q.options.forEach((opt, idx) => {
                          const letter = String.fromCharCode(65 + idx);
                          correctAnswerSelectHtml += `<option value="${letter}" ${q.correctAnswer.toUpperCase() === letter ? 'selected' : ''}>${letter}) ${opt}</option>`;
                      });
                    }
                }
                correctAnswerSelectHtml += `</select>`;
                correctAnswerInputGroup.innerHTML = `<label for="correct-answer-${qIndex}">Correct Answer:</label>` + correctAnswerSelectHtml;

                correctAnswerInputGroup.querySelector('.correct-answer-select').addEventListener('change', (e) => {
                    q.correctAnswer = e.target.value;
                });
              }

              updateCorrectAnswerSelect(); // Initial call to render the select

          } else { // Short Answer
              optionsContainer.style.display = 'none'; // Hide options
              correctAnswerInputGroup.innerHTML += `<input type="text" id="correct-answer-${qIndex}" class="correct-answer-text" value="${q.correctAnswer || ''}" placeholder="Type the exact answer" required>`;
              correctAnswerInputGroup.querySelector('.correct-answer-text').addEventListener('input', (e) => {
                  q.correctAnswer = e.target.value;
              });
          }
      }

      // Initial render for options of this question
      updateOptionsAndCorrectAnswerDisplay();

      // Event listener for question type change
      questionTypeSelect.addEventListener("change", (e) => {
          q.questionType = e.target.value; // Update question type in data model
          // If changing from option-based to short answer, clear options and correct answer
          if (q.questionType === 'ShortAnswer') {
              q.options = [];
              q.correctAnswer = '';
          } else if (q.questionType === 'True/False') {
              q.options = ["True", "False"]; // Initialize True/False options
              if (!['true', 'false'].includes(q.correctAnswer.toLowerCase())) {
                 q.correctAnswer = ''; // Reset correct answer if it's not valid
              }
          } else if (q.questionType === 'MCQ' && q.options.length < 2) {
              q.options = ["", ""]; // Ensure at least two options for MCQ
              q.correctAnswer = ''; // Clear correct answer
          }

          renderQuestions(); // Re-render to update the options section and correct answer input
      });

      // Event listener for "Remove Question" button
      questionDiv.querySelector(`.remove-question-btn`).addEventListener("click", () => {
          if (confirm("Are you sure you want to remove this question?")) {
              questions.splice(qIndex, 1); // Remove from the array
              renderQuestions(); // Re-render to update question numbers
          }
      });
    });
  }

  if (quizToEdit) {
    renderQuestions(); // Initial render for existing quiz questions
  }

  // Event listener for "Add Question" button
  addQuestionBtn.addEventListener("click", () => {
    questions.push({
      questionText: "",
      questionType: "MCQ", // Default to MCQ for new questions
      options: ["", ""], // Start with two empty options for user convenience
      correctAnswer: "",
      points: 1,
      explanation: "",
    });
    renderQuestions(); // Re-render to show the new question
  });

  // Event listener for the main quiz form submission (Create Quiz / Update Quiz)
  quizForm.addEventListener("submit", async (e) => { // Listen directly on the form
    e.preventDefault();

    // Collect updated questions and options from the data model, not directly from DOM elements
    // The inputs' event listeners already updated the 'questions' array.
    const finalQuestions = questions.map(q => {
        // Ensure options are filtered for empty strings before sending
        const filteredOptions = (q.questionType === 'MCQ' || q.questionType === 'True/False')
            ? q.options.filter(option => option.trim() !== '')
            : [];
        return {
            _id: q._id, // Keep existing _id for updates
            questionText: q.questionText.trim(),
            questionType: q.questionType,
            options: filteredOptions,
            correctAnswer: q.correctAnswer.trim(),
            points: q.points,
            explanation: q.explanation.trim(),
        };
    });


    const quizData = {
      title: document.getElementById("quiz-title").value.trim(),
      description: document.getElementById("quiz-description").value.trim(),
      subject: document.getElementById("quiz-subject").value.trim(),
      category: document.getElementById("quiz-category").value.trim(),
      difficulty: document.getElementById("quiz-difficulty").value,
      duration: parseInt(document.getElementById("quiz-duration").value),
      questions: finalQuestions, // Use the updated data model
      targetGrade: document.getElementById("quiz-targetGrade").value,
    };

    // --- Client-side Validation ---
    if (!quizData.title || !quizData.subject || isNaN(quizData.duration) || quizData.duration < 1 || !quizData.targetGrade) {
        showMessage('error', 'Please fill in all required quiz details (Title, Subject, Duration, Target Grade). Duration must be at least 1 minute.');
        return;
    }
    if (quizData.questions.length === 0) {
        showMessage('error', 'Please add at least one question to the quiz.');
        return;
    }

    for (const q of quizData.questions) {
        if (!q.questionText) {
            showMessage('error', `Question text cannot be empty for Question ${quizData.questions.indexOf(q) + 1}.`);
            return;
        }
        if (!q.correctAnswer) {
            showMessage('error', `Correct answer cannot be empty for Question ${quizData.questions.indexOf(q) + 1}.`);
            return;
        }
        if (isNaN(q.points) || q.points < 1) {
            showMessage('error', 'Points must be a positive number for all questions.');
            return;
        }

        if (q.questionType === 'MCQ') {
            if (q.options.length < 2) {
                showMessage('error', `MCQ question ${quizData.questions.indexOf(q) + 1} must have at least two options.`);
                return;
            }
            const correctOptionLetter = q.correctAnswer.toUpperCase();
            const optionLetters = q.options.map((_, i) => String.fromCharCode(65 + i));
            if (!optionLetters.includes(correctOptionLetter)) {
                showMessage('error', `Correct answer for MCQ question ${quizData.questions.indexOf(q) + 1} must be one of the displayed option letters (${optionLetters.join(', ')}).`);
                return;
            }
        } else if (q.questionType === 'True/False') {
             if (!['true', 'false'].includes(q.correctAnswer.toLowerCase())) {
                 showMessage('error', `Correct answer for True/False question ${quizData.questions.indexOf(q) + 1} must be 'True' or 'False'.`);
                 return;
             }
        }
    }
    // --- End Client-side Validation ---


    showLoadingSpinner();
    try {
      const method = quizId ? "PUT" : "POST";
      const url = quizId
        ? `${API_BASE_URL}/quizzes/${quizId}`
        : `${API_BASE_URL}/quizzes`;

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(quizData),
      });

      const data = await response.json();
      if (response.ok) {
        showMessage(
          "success",
          `Quiz ${quizId ? "updated" : "created"} successfully!`
        );
        renderDashboard();
      } else {
        showMessage("error", data.message || `Failed to ${quizId ? "update" : "create"} quiz.`);
      }
    } catch (error) {
      showMessage(
        "error",
        `Network error. Could not ${quizId ? "update" : "create"} quiz.`
      );
      console.error("Quiz form error:", error);
    } finally {
      hideLoadingSpinner();
    }
  });
}

// currentQuizQuestions declared globally at top

async function renderTakeQuiz(quizId) {
  if (!userToken || currentUser.role !== "student") {
    showMessage("error", "Unauthorized to take quizzes.");
    renderDashboard();
    return;
  }

  quizInProgressQuizId = quizId; // Set current quiz being taken
  showLoadingSpinner();
  try {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const quiz = await response.json();

    if (!response.ok) {
      showMessage("error", quiz.message || "Failed to load quiz.");
      renderDashboard();
      return;
    }

    currentQuizQuestions = quiz.questions;
    let timeLeft = quiz.duration * 60; // Convert minutes to seconds

    appContainer.innerHTML = `
            <h2>${quiz.title}</h2>
            <p>Subject: ${quiz.subject} | Difficulty: ${
      quiz.difficulty
    } | Duration: ${quiz.duration} minutes</p>
            <div id="quiz-timer" class="message info">Time Left: ${formatTime(
              timeLeft
            )}</div>
            <form id="quiz-form-submit" class="quiz-questions">
                <!-- Questions will be loaded here -->
            </form>
            <button id="submit-quiz-btn" class="action-button">Submit Quiz</button>
        `;

    const quizForm = document.getElementById("quiz-form-submit");
    currentQuizQuestions.forEach((q, index) => {
      const questionDiv = document.createElement("div");
      questionDiv.className = "question-item";
      questionDiv.innerHTML = `
                <p><strong>${index + 1}. ${q.questionText} (${
        q.points
      } points)</strong></p>
                <div class="question-options" data-question-id="${q._id}">
                    ${
                      q.questionType === "MCQ" // For MCQ, value is the letter, display is letter + text
                        ? q.options
                            .map(
                              (option, optIndex) => `
                            <label>
                                <input type="radio" name="question-${q._id}" value="${String.fromCharCode(65 + optIndex)}"> ${String.fromCharCode(65 + optIndex)}) ${option}
                            </label>
                        `
                            )
                            .join("")
                        : q.questionType === "True/False" // For True/False, value is True/False, display is True/False
                        ? q.options
                            .map(
                              (option) => `
                            <label>
                                <input type="radio" name="question-${q._id}" value="${option}"> ${option}
                            </label>
                        `
                            )
                            .join("")
                        : `
                            <label>Your Answer:</label>
                            <input type="text" name="question-${q._id}" placeholder="Type your answer here">
                        `
                    }
                </div>
            `;
      quizForm.appendChild(questionDiv);
    });

    // Timer functionality
    const quizTimerDisplay = document.getElementById("quiz-timer");
    clearInterval(quizTimerInterval); // Clear any existing timer
    quizTimerInterval = setInterval(() => {
      timeLeft--;
      quizTimerDisplay.textContent = `Time Left: ${formatTime(timeLeft)}`;
      if (timeLeft <= 60) {
        // Warn when 1 minute left
        quizTimerDisplay.className = "message warning";
      }
      if (timeLeft <= 0) {
        clearInterval(quizTimerInterval);
        alert("Time is up! Your quiz is being submitted automatically.");
        submitQuiz(quizId);
      }
    }, 1000);

    document.getElementById("submit-quiz-btn").addEventListener("click", () => {
      if (
        confirm(
          "Are you sure you want to submit your quiz? You cannot change answers after submission."
        )
      ) {
        submitQuiz(quizId);
      }
    });
  } catch (error) {
    showMessage("error", "Network error loading quiz.");
    console.error("Error taking quiz:", error);
    renderDashboard();
  } finally {
    hideLoadingSpinner();
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

async function submitQuiz(quizId) {
  clearInterval(quizTimerInterval); // Stop the timer
  quizInProgressQuizId = null; // Clear quiz in progress

  const answers = [];
  currentQuizQuestions.forEach((q) => { // qIndex not needed here
    const questionElement = appContainer.querySelector(
      `[data-question-id="${q._id}"]`
    );
    let userAnswer = "";

    if (q.questionType === "MCQ" || q.questionType === "True/False") {
      const selectedOption = questionElement.querySelector(
        `input[name="question-${q._id}"]:checked`
      );
      if (selectedOption) {
        userAnswer = selectedOption.value;
      }
    } else if (q.questionType === "ShortAnswer") {
      const inputField = questionElement.querySelector(
        `input[name="question-${q._id}"]`
      );
      if (inputField) {
        userAnswer = inputField.value;
      }
    }
    answers.push({ questionId: q._id, userAnswer: userAnswer });
  });

  showLoadingSpinner();
  try {
    const response = await fetch(`${API_BASE_URL}/results/submit/${quizId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ answers }),
    });
    const result = await response.json();

    if (response.ok) {
      showMessage(
        "success",
        "Quiz submitted successfully! Review your results below."
      );
      renderQuizResults(result._id); // Show detailed results
    } else {
      showMessage("error", result.message || "Failed to submit quiz.");
      console.error("Submit quiz error:", result);
      renderDashboard();
    }
  } catch (error) {
    showMessage("error", "Network error submitting quiz.");
    console.error("Submit quiz network error:", error);
    renderDashboard();
  } finally {
    hideLoadingSpinner();
  }
}

// Helper function to get option text from letter/value
function getOptionTextFromAnswer(question, answerValue) {
    if (!answerValue) return '[No Answer]'; // Handle cases where no answer was provided

    if (question.questionType === 'MCQ') {
        const optionIndex = answerValue.charCodeAt(0) - 65; // 'A' is 65
        if (question.options[optionIndex]) {
            return `${answerValue}) ${question.options[optionIndex]}`;
        }
        return answerValue; // Fallback if option text not found for letter
    } else if (question.questionType === 'True/False') {
        return answerValue; // For True/False, the value is already the text
    }
    return answerValue; // For ShortAnswer or if type is not recognized
}


async function renderQuizResults(resultId) {
  if (!userToken || currentUser.role !== "student") {
    showMessage("error", "Unauthorized to view results.");
    renderDashboard();
    return;
  }
  showLoadingSpinner();
  try {
    const response = await fetch(`${API_BASE_URL}/results/${resultId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const result = await response.json();

    if (!response.ok || !result) {
      showMessage("error", result.message || "Failed to fetch quiz results.");
      renderDashboard();
      return;
    }

    const quiz = result.quiz; // Quiz details are populated in the result object

    appContainer.innerHTML = `
            <h2>Results for "${quiz.title}"</h2>
            <p>Your Score: <strong>${result.score}</strong> / ${
      quiz.totalPoints
    } </p>
            <p>Correct Answers: <strong>${result.correctAnswers}</strong> / ${
      result.totalQuestions
    }</p>
            <p>Percentage: <strong>${(
              (result.score / quiz.totalPoints) *
              100
            ).toFixed(2)}%</strong></p>
            <h3>Detailed Breakdown:</h3>
            <div id="detailed-results"></div>
            <button id="back-to-dashboard-btn" class="action-button">Back to Dashboard</button>
        `;

    const detailedResultsDiv = document.getElementById("detailed-results");
    result.answeredQuestions.forEach((ans, qIndex) => {
      const originalQuestion = quiz.questions.id(ans.questionId); // Access original question with correct answer and explanation
      if (originalQuestion) {
        const resultItem = document.createElement("div");
        resultItem.className = `question-item ${
          ans.isCorrect ? "correct" : "incorrect"
        }`; // Apply classes for styling

        let optionsHtml = '';
        if (originalQuestion.questionType === 'MCQ' || originalQuestion.questionType === 'True/False') {
             optionsHtml = `<p>Options: ${originalQuestion.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join(' | ')}</p>`;
        }

        // Get full text for correct answer and user's answer
        const displayCorrectAnswer = getOptionTextFromAnswer(originalQuestion, originalQuestion.correctAnswer);
        const displayUserAnswer = getOptionTextFromAnswer(originalQuestion, ans.userAnswer);


        resultItem.innerHTML = `
                    <p><strong>Q: ${qIndex + 1}. ${originalQuestion.questionText}</strong></p>
                    ${optionsHtml}
                    <p>Your Answer: <strong>${
                      displayUserAnswer || "[No Answer]"
                    }</strong></p>
                    <p>Correct Answer: <strong>${
                      displayCorrectAnswer
                    }</strong></p>
                    <p>Status: <strong style="color: ${
                      ans.isCorrect
                        ? "var(--success-text)"
                        : "var(--error-text)"
                    };">${ans.isCorrect ? "Correct" : "Incorrect"}</strong></p>
                    ${
                      originalQuestion.explanation
                        ? `<p>Explanation: <em>${originalQuestion.explanation}</em></p>`
                        : ""
                    }
                    <p>Points Awarded: ${ans.pointsAwarded}/${
          originalQuestion.points
        }</p>
                `;
        detailedResultsDiv.appendChild(resultItem);
      }
    });

    document
      .getElementById("back-to-dashboard-btn")
      .addEventListener("click", renderDashboard);
  } catch (error) {
    showMessage("error", "Error displaying results.");
    console.error("Error rendering results:", error);
    renderDashboard();
  } finally {
    hideLoadingSpinner();
  }
}

async function renderQuizResultsForTeacher(quizId) {
  if (!userToken || currentUser.role !== "teacher") {
    showMessage("error", "Unauthorized to view results.");
    renderDashboard();
    return;
  }

  showLoadingSpinner();
  try {
    const response = await fetch(`${API_BASE_URL}/results/quiz/${quizId}/all`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const allResults = await response.json();

    const quizResponse = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const quiz = await quizResponse.json();

    if (!response.ok || !quizResponse.ok) {
      showMessage(
        "error",
        allResults.message || "Failed to fetch quiz or results for teacher."
      );
      renderDashboard();
      return;
    }

    appContainer.innerHTML = `
            <h2>Results for Quiz: "${quiz.title}" <span class="badge-grade">${quiz.targetGrade}</span></h2>
            <p>Total questions: ${quiz.questions.length} | Total Possible Points: ${quiz.totalPoints}</p>
            <h3>Student Attempts:</h3>
            <div id="teacher-results-list" class="card-list"></div>
            <h3>Performance Overview:</h3>
            <canvas id="quiz-performance-chart" style="max-width: 600px; max-height: 400px;"></canvas>
            <button id="back-to-dashboard-btn" class="action-button">Back to Dashboard</button>
        `;

    const teacherResultsList = document.getElementById("teacher-results-list");
    if (allResults.length === 0) {
      teacherResultsList.innerHTML =
        "<p>No students have attempted this quiz yet.</p>";
    } else {
      allResults.forEach((result) => {
        const resultCard = document.createElement("div");
        resultCard.className = "card";
        const percentage =
          quiz.totalPoints > 0
            ? ((result.score / quiz.totalPoints) * 100).toFixed(2)
            : "N/A";

        resultCard.innerHTML = `
                    <div class="card-content">
                        <h4>Student: ${
                          result.user ? result.user.username : "Unknown User"
                        } (${result.user ? result.user.email : ""})</h4>
                        <p>Score: <strong>${result.score}</strong> / ${
          quiz.totalPoints
        } (${percentage}%)</p>
                        <p>Correct Answers: <strong>${result.correctAnswers}</strong> / ${
          result.totalQuestions
        }</p>
                        <p>Attempted At: ${new Date(
                          result.attemptedAt
                        ).toLocaleString()}</p>
                    </div>
                    <div class="card-actions">
                        <button class="action-button view-detailed-teacher-result-btn" data-result-id="${result._id}" data-quiz-id="${quiz._id}">View Details</button>
                    </div>
                `;
        teacherResultsList.appendChild(resultCard);
      });

      // Add event listener for the new "View Details" button for teachers
      teacherResultsList.querySelectorAll('.view-detailed-teacher-result-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            renderDetailedStudentResultForTeacher(e.target.dataset.resultId);
        });
      });


      // Chart.js for analytics
      const ctx = document
        .getElementById("quiz-performance-chart")
        .getContext("2d");
      const scores = allResults.map((r) => (r.score / quiz.totalPoints) * 100);
      const labels = allResults.map((r) => (r.user ? r.user.username : "Anon"));

      new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Score (%)",
              data: scores,
              backgroundColor: "rgba(75, 192, 192, 0.6)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // Allow custom sizing
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: "Score Percentage",
              },
            },
            x: {
              title: {
                display: true,
                text: "Student",
              },
            },
          },
          plugins: {
            legend: {
              display: true,
            },
            title: {
              display: true,
              text: `Quiz Performance for "${quiz.title}"`,
            },
          },
        },
      });
    }

    document
      .getElementById("back-to-dashboard-btn")
      .addEventListener("click", renderDashboard);
  } catch (error) {
    showMessage("error", "Error displaying teacher results.");
    console.error("Error rendering teacher results:", error);
    renderDashboard();
  } finally {
    hideLoadingSpinner();
  }
}

// --- Function: Render Detailed Student Result for Teacher ---
async function renderDetailedStudentResultForTeacher(resultId) {
    if (!userToken || currentUser.role !== 'teacher') {
        showMessage('error', 'Unauthorized to view detailed results.');
        renderDashboard();
        return;
    }

    showLoadingSpinner();
    try {
        const response = await fetch(`${API_BASE_URL}/results/${resultId}`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const result = await response.json();

        if (!response.ok || !result) {
            showMessage('error', result.message || 'Failed to fetch quiz results for this student.');
            renderDashboard();
            return;
        }

        const quiz = result.quiz;

        appContainer.innerHTML = `
            <h2>Detailed Results for "${quiz.title}" by ${result.user.username} <span class="badge-grade">${quiz.targetGrade}</span></h2>
            <p>Student Score: <strong>${result.score}</strong> / ${quiz.totalPoints}</p>
            <p>Correct Answers: <strong>${result.correctAnswers}</strong> / ${result.totalQuestions}</p>
            <p>Percentage: <strong>${((result.score / quiz.totalPoints) * 100).toFixed(2)}%</strong></p>
            <p>Attempted On: ${new Date(result.attemptedAt).toLocaleString()}</p>
            <h3>Question Breakdown:</h3>
            <div id="detailed-teacher-results"></div>
            <button id="back-to-teacher-quiz-results-btn" class="action-button">Back to Quiz Results</button>
        `;

        const detailedResultsDiv = document.getElementById("detailed-teacher-results");
        result.answeredQuestions.forEach((ans, qIndex) => {
            const originalQuestion = quiz.questions.id(ans.questionId);
            if (originalQuestion) {
                const resultItem = document.createElement("div");
                resultItem.className = `question-item ${ans.isCorrect ? 'correct' : 'incorrect'}`;

                let optionsHtml = '';
                if (originalQuestion.questionType === 'MCQ' || originalQuestion.questionType === 'True/False') {
                     optionsHtml = `<p>Options: ${originalQuestion.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join(' | ')}</p>`;
                }

                const displayCorrectAnswer = getOptionTextFromAnswer(originalQuestion, originalQuestion.correctAnswer);
                const displayUserAnswer = getOptionTextFromAnswer(originalQuestion, ans.userAnswer);


                resultItem.innerHTML = `
                    <p><strong>Q: ${qIndex + 1}. ${originalQuestion.questionText}</strong></p>
                    ${optionsHtml}
                    <p>Student's Answer: <strong>${displayUserAnswer || '[No Answer]'}</strong></p>
                    <p>Correct Answer: <strong>${displayCorrectAnswer}</strong></p>
                    <p>Status: <strong style="color: ${ans.isCorrect ? 'var(--success-text)' : 'var(--error-text)'};">${ans.isCorrect ? 'Correct' : 'Incorrect'}</strong></p>
                    ${originalQuestion.explanation ? `<p>Explanation: <em>${originalQuestion.explanation}</em></p>` : ''}
                    <p>Points Awarded: ${ans.pointsAwarded}/${originalQuestion.points}</p>
                `;
                detailedResultsDiv.appendChild(resultItem);
            }
        });

        document.getElementById('back-to-teacher-quiz-results-btn').addEventListener('click', () => {
            renderQuizResultsForTeacher(quiz._id);
        });

    } catch (error) {
        showMessage('error', 'Error displaying detailed student results for teacher.');
        console.error('Error rendering detailed teacher results:', error);
        renderDashboard();
    } finally {
        hideLoadingSpinner();
    }
}


// --- Admin Dashboard Render Function ---
async function renderAdminDashboard() {
  if (!userToken || currentUser.role !== "admin") {
    showMessage("error", "Unauthorized to view Admin Dashboard.");
    renderAuthPage(false);
    return;
  }

  appContainer.innerHTML = `
        <h2>Admin Dashboard</h2>
        <h3>Platform Statistics</h3>
        <div id="admin-stats">Loading stats...</div>

        <h3>User Management</h3>
        <div id="pending-teachers-list" class="card-list">Loading pending teachers...</div>
        <div id="all-teachers-list" class="card-list">Loading teachers...</div>
        <div id="all-students-list" class="card-list">Loading students...</div>
    `;

  showLoadingSpinner();
  try {
    const statsResponse = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const stats = await statsResponse.json();
    if (statsResponse.ok) {
      document.getElementById("admin-stats").innerHTML = `
                <p>Total Users: <strong>${stats.totalUsers}</strong></p>
                <p>Total Students: <strong>${stats.totalStudents}</strong></p>
                <p>Total Approved Teachers: <strong>${stats.totalTeachers}</strong></p>
                <p>Total Pending Teachers: <strong>${stats.totalPendingTeachers}</strong></p>
                <p>Total Admins: <strong>${stats.totalAdmins}</strong></p>
                <p>Total Quizzes: <strong>${stats.totalQuizzes}</strong></p>
                <p>Total Quiz Attempts: <strong>${stats.totalQuizResults}</strong></p>
            `;
    } else {
      showMessage("error", stats.message || "Failed to fetch stats.");
    }
  } catch (error) {
    showMessage("error", "Network error fetching stats.");
    console.error("Error fetching admin stats:", error);
  } finally {
    hideLoadingSpinner();
  }

  async function renderUserList(
    containerId,
    roleFilter,
    title,
    enableApprove = false,
    enableDelete = false,
    enableRoleChange = false
  ) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<h4>${title}</h4><p>Loading...</p>`;
    showLoadingSpinner();
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/users${roleFilter ? `?role=${roleFilter}` : ""}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      const users = await response.json();

      if (response.ok) {
        if (users.length === 0) {
          container.innerHTML = `<h4>${title}</h4><p>No ${
            roleFilter ? roleFilter.replace("_", " ") : "users"
          } found.</p>`;
        } else {
          container.innerHTML = `<h4>${title}</h4>`;
          const userListDiv = document.createElement("div");
          userListDiv.className = "card-list";
          users.forEach((user) => {
            const userCard = document.createElement("div");
            userCard.className = "card";
            userCard.innerHTML = `
                            <div class="card-content">
                                <strong>${user.username}</strong> (${
              user.email
            })<br>
                                Role: ${
                                  user.role === "pending_teacher"
                                    ? "Pending Teacher"
                                    : user.role
                                }
                                <br>
                                Name: ${user.firstName} ${user.lastName} <br>
                                School: ${user.schoolName} <br>
                                Grade: ${user.gradeClass} <br>
                                DOB: ${new Date(user.dateOfBirth).toLocaleDateString()}
                            </div>
                            <div class="card-actions">
                                ${
                                  enableApprove &&
                                  user.role === "pending_teacher"
                                    ? `<button class="approve-btn" data-id="${user._id}">Approve Teacher</button>`
                                    : ""
                                }
                                ${
                                  enableDelete && user._id !== currentUser._id
                                    ? `<button class="delete-btn" data-id="${user._id}">Delete User</button>`
                                    : ""
                                }
                                ${
                                  enableRoleChange &&
                                  user._id !== currentUser._id &&
                                  user.role !== "admin"
                                    ? `
                                    <select class="change-role-select" data-id="${
                                      user._id
                                    }">
                                        <option value="">Change Role</option>
                                        <option value="student" ${
                                          user.role === "student"
                                            ? "selected"
                                            : ""
                                        }>Student</option>
                                        <option value="teacher" ${
                                          user.role === "teacher"
                                            ? "selected"
                                            : ""
                                        }>Teacher</option>
                                        <option value="pending_teacher" ${
                                          user.role === "pending_teacher"
                                            ? "selected"
                                            : ""
                                        }>Pending Teacher</option>
                                    </select>
                                `
                                    : ""
                                }
                            </div>
                        `;
            userListDiv.appendChild(userCard);
          });
          container.appendChild(userListDiv);

          // Add event listeners for buttons
          userListDiv.querySelectorAll(".approve-btn").forEach((button) => {
            button.addEventListener("click", async (e) => {
              if (confirm("Are you sure you want to approve this teacher?")) {
                await approveTeacher(e.target.dataset.id);
                renderAdminDashboard(); // Refresh
              }
            });
          });
          userListDiv.querySelectorAll(".delete-btn").forEach((button) => {
            button.addEventListener("click", async (e) => {
              if (
                confirm(
                  "Are you sure you want to delete this user and all associated data (quizzes, results)? This action cannot be undone."
                )
              ) {
                await deleteUser(e.target.dataset.id);
                renderAdminDashboard(); // Refresh
              }
            });
          });
          userListDiv
            .querySelectorAll(".change-role-select")
            .forEach((select) => {
              select.addEventListener("change", async (e) => {
                const newRole = e.target.value;
                const userId = e.target.dataset.id;
                if (
                  newRole &&
                  confirm(
                    `Are you sure you want to change this user's role to ${newRole}?`
                  )
                ) {
                  await changeUserRole(userId, newRole);
                  renderAdminDashboard(); // Refresh
                }
              });
            });
        }
      } else {
        showMessage(
          "error",
          users.message ||
            `Failed to fetch ${
              roleFilter ? roleFilter.replace("_", " ") : "users"
            }.`
        );
      }
    } catch (error) {
      showMessage(
        "error",
        `Network error fetching ${
          roleFilter ? roleFilter.replace("_", " ") : "users"
        }.`
      );
      console.error(
        `Error fetching ${
          roleFilter ? roleFilter.replace("_", " ") : "users"
        }:`,
        error
      );
    } finally {
      hideLoadingSpinner();
    }
  }

  await renderUserList(
    "pending-teachers-list",
    "pending_teacher",
    "Pending Teacher Approvals",
    true,
    true
  );
  await renderUserList(
    "all-teachers-list",
    "teacher",
    "Approved Teachers",
    false,
    true,
    true
  );
  await renderUserList(
    "all-students-list",
    "student",
    "All Students",
    false,
    true,
    true
  );
}

// Admin actions
async function approveTeacher(userId) {
  showLoadingSpinner();
  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/users/${userId}/approve-teacher`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );
    const data = await response.json();
    if (response.ok) {
      showMessage("success", data.message);
    } else {
      showMessage("error", data.message || "Failed to approve teacher.");
    }
  } catch (error) {
    showMessage("error", "Network error during teacher approval.");
    console.error("Approve teacher error:", error);
  } finally {
    hideLoadingSpinner();
  }
}

async function deleteUser(userId) {
  showLoadingSpinner();
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data = await response.json();
    if (response.ok) {
      showMessage("success", data.message);
    } else {
      showMessage("error", data.message || "Failed to delete user.");
    }
  } catch (error) {
    showMessage("error", "Network error during user deletion.");
    console.error("Delete user error:", error);
  } finally {
    hideLoadingSpinner();
  }
}

async function changeUserRole(userId, newRole) {
  showLoadingSpinner();
  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/users/${userId}/change-role`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ newRole }),
      }
    );
    const data = await response.json();
    if (response.ok) {
      showMessage("success", data.message);
    } else {
      showMessage("error", data.message || "Failed to change user role.");
    }
  } catch (error) {
    showMessage("error", "Network error during role change.");
    console.error("Change role error:", error);
  } finally {
    hideLoadingSpinner();
  }
}

// --- Event Listeners for Navigation ---
navLoginRegister.addEventListener("click", () => renderAuthPage(false));
navLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  currentUser = null;
  clearInterval(quizTimerInterval); // Clear timer on logout
  showMessage("success", "Logged out successfully!");
  updateNav();
  renderAuthPage(false); // Redirect to login after logout
});
navDashboard.addEventListener("click", renderDashboard);
navCreateQuiz.addEventListener("click", () => renderCreateQuiz());

// --- Initial Load ---
document.addEventListener("DOMContentLoaded", async () => {
  // Clear initial load message
  const initialMessage = document.querySelector(".initial-load-message");
  if (initialMessage) initialMessage.remove();

  await fetchUserProfile(); // Try to fetch profile if token exists

  if (!userToken) {
    renderAuthPage(false); // Render login by default
  } else {
    // Decide which dashboard to render based on role
    if (currentUser && currentUser.role === "admin") {
      renderAdminDashboard();
    } else {
      renderDashboard();
    }
  }
});

// Optional: Warn user before leaving page if quiz is in progress
window.addEventListener("beforeunload", (event) => {
  if (quizInProgressQuizId) {
    event.preventDefault(); // Standard for browsers
    event.returnValue = ""; // For older browsers
    return ""; // For some browsers
  }
});
