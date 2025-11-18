// student.js - dashboard logic
document.addEventListener('DOMContentLoaded', initStudent);

async function initStudent() {
  try {
    requireAuthOrRedirect();
  } catch(e) { return; }

  const student = JSON.parse(localStorage.getItem('student') || '{}');
  document.getElementById('userWelcome').innerText = student.name || 'Student';
  document.getElementById('userEmail').innerText = student.email || '';
  document.getElementById('userCourse').innerText = student.course_name || (student.course || '—');
  document.getElementById('studentName').innerText = student.name || '';

  // attach logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    logoutFrontend();
  });
  document.getElementById('manualLogout').addEventListener('click', () => {
    logoutFrontend();
  });

  // load data
  const courseId = student.course_id || student.course || 1;
  await loadTasks(courseId, student.id);
  await loadResults(student.id);
  await updateAttendanceInfo(student.id);

  document.getElementById('checkExam').addEventListener('click', async () => {
    try {
      const res = await request(`/courses/${courseId}/eligible/${student.id}`);
      document.getElementById('examResult').innerText = res.eligible ? 'Exam Enabled ✅' : `Not eligible (${res.completedTasks}/${res.totalTasks})`;
    } catch (err) {
      document.getElementById('examResult').innerText = 'Error: ' + err.message;
    }
  });
}

async function loadTasks(courseId, studentId) {
  try {
    const tasks = await request(`/tasks/course/${courseId}`);
    const container = document.getElementById('taskList');
    if (!tasks || tasks.length === 0) {
      container.innerHTML = '<div class="text-muted">No tasks assigned yet.</div>';
      document.getElementById('taskProgress').innerText = '0/0';
      document.getElementById('taskProgressBar').style.width = '0%';
      return;
    }

    container.innerHTML = tasks.map(t => `
      <div class="card mb-2 p-2">
        <div class="d-flex justify-content-between align-items-center">
          <div><strong>${escapeHtml(t.title)}</strong><div class="text-muted small">${escapeHtml(t.description || '')}</div></div>
          <div>
            <button class="btn btn-sm btn-success" onclick="completeTask(${t.id})">Complete</button>
          </div>
        </div>
      </div>
    `).join('');

    // get summary for progress
    const summary = await request(`/courses/${courseId}/eligible/${studentId}`);
    const total = summary.totalTasks || 0;
    const done = summary.completedTasks || 0;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    document.getElementById('taskProgress').innerText = `${done}/${total}`;
    document.getElementById('taskProgressBar').style.width = percent + '%';
  } catch (err) {
    console.error(err);
    document.getElementById('taskList').innerText = 'Unable to load tasks';
  }
}

async function completeTask(taskId) {
  const student = JSON.parse(localStorage.getItem('student') || '{}');
  try {
    await request('/tasks/complete', { method: 'POST', body: { student_id: student.id, task_id: taskId }});
    await loadTasks(student.course_id || student.course || 1, student.id);
    showToast('✅ Task marked complete');
  } catch (err) {
    showToast('❌ Could not complete task: ' + err.message);
  }
}

async function loadResults(studentId) {
  try {
    // expected backend endpoint: GET /results/student/:studentId
    const res = await request(`/results/student/${studentId}`);
    const el = document.getElementById('resultsArea');
    if (!res || res.length === 0) {
      el.innerHTML = '<div class="text-muted">No results yet</div>';
      return;
    }
    let html = '<ul class="list-group">';
    for (const r of res) {
      html += `<li class="list-group-item d-flex justify-content-between align-items-center">
        ${escapeHtml(r.title)} - ${r.marks_obtained}/${r.total_marks} <span class="${r.status === 'Pass' ? 'text-success' : 'text-danger'}">${r.status}</span>
      </li>`;
    }
    html += '</ul>';
    el.innerHTML = html;
  } catch (err) {
    console.warn('Results load error', err);
    document.getElementById('resultsArea').innerText = 'Unable to load results';
  }
}

async function updateAttendanceInfo(studentId) {
  try {
    // expected backend endpoint: GET /attendance/student/:studentId
    const rows = await request(`/attendance/student/${studentId}`);
    if (Array.isArray(rows) && rows.length > 0) {
      const today = rows.find(r => new Date(r.login_time).toDateString() === new Date().toDateString());
      document.getElementById('todayAttendance').innerText = today ? new Date(today.login_time).toLocaleTimeString() : 'Not logged today';
      document.getElementById('lastDuration').innerText = rows[0].duration_minutes || '—';
      document.getElementById('attendanceStatus').innerText = today ? 'Logged in ✓' : 'Not logged';
    } else {
      document.getElementById('todayAttendance').innerText = '—';
      document.getElementById('lastDuration').innerText = '—';
      document.getElementById('attendanceStatus').innerText = 'Not logged';
    }
  } catch (err) {
    console.warn('attendance info error', err);
  }
}

/* small helper for XSS safety when injecting strings */
function escapeHtml(str = '') {
  return str.replace && str.replace(/[&<>"']/g, (s) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

function showToast(message) {
  const el = document.getElementById('actionToast');
  const body = document.getElementById('actionToastBody');
  if (!el || !body) return alert(message);
  body.textContent = message;
  const toast = new bootstrap.Toast(el, { delay: 2500 });
  toast.show();
}
