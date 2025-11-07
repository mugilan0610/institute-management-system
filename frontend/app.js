// app.js - frontend logic with validation, password strength and POST submit

const form = document.getElementById('registerForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const pwInput = document.getElementById('password');
const courseInput = document.getElementById('course');
const submitBtn = document.getElementById('submitBtn');
const btnSpinner = document.getElementById('btnSpinner');
const btnText = document.getElementById('btnText');
const resultMessage = document.getElementById('resultMessage');

const nameError = document.getElementById('nameError');
const emailError = document.getElementById('emailError');
const pwError = document.getElementById('pwError');
const pwText = document.getElementById('pwText');
const pwStrengthBar = document.getElementById('pwStrengthBar');
const courseError = document.getElementById('courseError');

const togglePw = document.getElementById('togglePw');
togglePw.addEventListener('click', () => {
  const t = pwInput.type === 'password' ? 'text' : 'password';
  pwInput.type = t;
  togglePw.innerHTML = t === 'text' ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
});

// validation helpers
function isValidName(name) {
  // allow letters, spaces, min 2 chars
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

function updateFormState() {
  const nameOk = isValidName(nameInput.value);
  const emailOk = isValidEmail(emailInput.value);
  const pwScore = passwordStrengthScore(pwInput.value);
  const courseOk = validateCourse(courseInput.value);

  nameError.textContent = nameOk ? '' : 'Enter a valid name (letters and spaces only)';
  emailError.textContent = emailOk ? '' : 'Enter a valid email address';
  pwError.textContent = (pwInput.value && pwScore < 2) ? 'Password is weak: use 8+ chars, include upper/lower, numbers or symbols' : '';
  courseError.textContent = courseOk ? '' : 'Enter course name';

  // update password strength bar
  const percent = Math.min(100, (pwScore / 4) * 100);
  pwStrengthBar.style.width = percent + '%';
  pwStrengthBar.className = 'progress-bar'; // reset classes

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

  // enable submit only when all checks pass
  const allOk = nameOk && emailOk && (pwScore >= 2) && courseOk;
  submitBtn.disabled = !allOk;
}

// live validation
[nameInput, emailInput, pwInput, courseInput].forEach(el => {
  el.addEventListener('input', updateFormState);
});

// initial update
updateFormState();

// handle submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultMessage.textContent = '';
  btnSpinner.classList.remove('d-none');
  btnText.textContent = 'Registering...';
  submitBtn.disabled = true;

  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    password: pwInput.value, // NOTE: password sent in plaintext over localhost only. Use HTTPS for production.
    course: courseInput.value.trim()
  };

  try {
    const res = await fetch('http://localhost:5000/api/students/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
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
