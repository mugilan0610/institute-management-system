// =========================
// FRONTEND LOGIC + VALIDATION
// =========================

// DOM Elements
const form = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const pwInput = document.getElementById('password');
const courseInput = document.getElementById('course');
const submitBtn = document.getElementById('submitBtn');
const btnSpinner = document.getElementById('btnSpinner');
const btnText = document.getElementById('btnText');
const resultMessage = document.getElementById('resultMessage');

// Validation messages
const nameError = document.getElementById('nameError');
const emailError = document.getElementById('emailError');
const pwError = document.getElementById('pwError');
const pwText = document.getElementById('pwText');
const pwStrengthBar = document.getElementById('pwStrengthBar');
const courseError = document.getElementById('courseError');

// Password toggle
const togglePw = document.getElementById('togglePw');
if (togglePw) {
  togglePw.addEventListener('click', () => {
    const type = pwInput.type === 'password' ? 'text' : 'password';
    pwInput.type = type;
    togglePw.innerHTML = type === 'text' ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
  });
}

// Validation helper functions
function isValidName(name) {
  return /^[A-Za-z\s]{2,60}$/.test(name.trim());
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function passwordStrengthScore(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0..4
}
function validateCourse(text) {
  return text.trim().length >= 2;
}

// Live update form
function updateFormState() {
  const nameOk = isValidName(nameInput.value);
  const emailOk = isValidEmail(emailInput.value);
  const pwScore = passwordStrengthScore(pwInput.value);
  const courseOk = validateCourse(courseInput.value);

  nameError.textContent = nameOk ? '' : 'Enter a valid name (letters and spaces only)';
  emailError.textContent = emailOk ? '' : 'Enter a valid email address';
  pwError.textContent = (pwInput.value && pwScore < 2)
    ? 'Password is weak: use 8+ chars, include upper/lower, numbers or symbols'
    : '';
  courseError.textContent = courseOk ? '' : 'Select a course';

  // Password strength bar
  const percent = Math.min(100, (pwScore / 4) * 100);
  pwStrengthBar.style.width = percent + '%';
  pwStrengthBar.className = 'progress-bar';
  if (pwScore <= 1) {
    pwStrengthBar.classList.add('weak');
    pwText.textContent = 'Weak';
  } else if (pwScore === 2) {
    pwStrengthBar.classList.add('fair');
    pwText.textContent = 'Fair';
  } else if (pwScore === 3) {
    pwStrengthBar.classList.add('good');
    pwText.textContent = 'Good';
  } else {
    pwStrengthBar.classList.add('strong');
    pwText.textContent = 'Strong';
  }

  submitBtn.disabled = !(nameOk && emailOk && (pwScore >= 2) && courseOk);
}

// Listen input changes
[nameInput, emailInput, pwInput, courseInput].forEach(el => {
  el.addEventListener('input', updateFormState);
});
updateFormState();

// =========================
// REGISTER FORM SUBMIT
// =========================
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultMessage.textContent = '';
  btnSpinner.classList.remove('d-none');
  btnText.textContent = 'Registering...';
  submitBtn.disabled = true;

  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    password: pwInput.value,
    course: courseInput.value.trim()
  };

  try {
    const res = await fetch('http://localhost:5000/api/students/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      resultMessage.style.color = 'green';
      resultMessage.textContent = '✅ ' + (data.message || 'Registered successfully');
      form.reset();
      updateFormState();
    } else {
      resultMessage.style.color = 'crimson';
      resultMessage.textContent = '❌ ' + (data.error || data.message || 'Registration failed');
    }

  } catch (err) {
    console.error(err);
    resultMessage.style.color = 'orange';
    resultMessage.textContent = '⚠️ Could not connect to server';
  } finally {
    btnSpinner.classList.add('d-none');
    btnText.textContent = 'Register';
    updateFormState();
  }
});

// =========================
// LOGIN FORM SUBMIT
// =========================
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const loginMessage = document.getElementById('loginMessage');
  loginMessage.textContent = '🔄 Logging in...';

  try {
    const res = await fetch('http://localhost:5000/api/students/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok && data.token) {
      loginMessage.style.color = 'green';
      loginMessage.textContent = '✅ Login successful!';
      localStorage.setItem('token', data.token);
      localStorage.setItem('student', JSON.stringify(data.student));
      window.location = 'dashboard.html';
    } else {
      loginMessage.style.color = 'crimson';
      loginMessage.textContent = '❌ ' + (data.message || 'Invalid credentials');
    }
  } catch (err) {
    console.error(err);
    loginMessage.style.color = 'orange';
    loginMessage.textContent = '⚠️ Server not responding';
  }
});

// =========================
// DASHBOARD + LOGOUT HELPERS
// =========================
const API_ROOT = 'http://localhost:5000/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

async function request(path, { method = 'GET', body = null, headers = {} } = {}) {
  const opts = {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers, authHeaders())
  };
  if (body) opts.body = (typeof body === 'string') ? body : JSON.stringify(body);
  const res = await fetch(API_ROOT + path, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

function logoutFrontend() {
  localStorage.removeItem('token');
  localStorage.removeItem('student');
  window.location = 'index.html';
}

function requireAuthOrRedirect() {
  if (!localStorage.getItem('token')) {
    window.location = 'index.html';
    throw new Error('Not authenticated');
  }
}
