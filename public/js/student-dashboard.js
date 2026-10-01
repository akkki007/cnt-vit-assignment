let allClassrooms = [];
let allAssignments = [];
let activeCategory = 'all';

$(async function () {
  if (!Auth.requireRole('student')) return;
  await loadDashboard();
  wireEvents();
});

async function loadDashboard() {
  try {
    const { classrooms } = await Api.get('/classrooms');
    allClassrooms = classrooms;
    renderClassrooms();
    renderStats();
    await loadAllAssignments();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function loadAllAssignments() {
  allAssignments = [];
  try {
    const results = await Promise.all(
      allClassrooms.map((c) => Api.get(`/assignments/classroom/${c._id}`).catch(() => ({ assignments: [] })))
    );
    results.forEach((res, i) => {
      const classroom = allClassrooms[i];
      res.assignments.forEach((a) => {
        allAssignments.push({ ...a, classroomName: classroom.name, classroomId: classroom._id });
      });
    });
    allAssignments.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    renderAssignments();
    renderStats();
  } catch (err) {
    showToast('Could not load assignments', 'danger');
  }
}

function renderStats() {
  const pending = allAssignments.filter((a) => a.computedStatus === 'pending').length;
  const submitted = allAssignments.filter((a) => ['submitted', 'late'].includes(a.computedStatus)).length;
  const graded = allAssignments.filter((a) => a.computedStatus === 'graded');
  const avg = graded.length
    ? Math.round(graded.reduce((sum, a) => sum + (a.mySubmission ? (a.mySubmission.marks / a.maxMarks) * 100 : 0), 0) / graded.length)
    : null;

  const stats = [
    { label: 'Classrooms', value: allClassrooms.length, icon: 'bi-columns-gap', hint: 'Joined with a class code' },
    { label: 'Pending', value: pending, icon: 'bi-hourglass-split', hint: pending ? 'Assignments still to submit' : 'Nothing due right now' },
    { label: 'Submitted', value: submitted, icon: 'bi-send-check', hint: 'Waiting for a grade' },
    { label: 'Average score', value: avg !== null ? `${avg}%` : '—', icon: 'bi-graph-up-arrow', hint: `${graded.length} graded assignment${graded.length === 1 ? '' : 's'}` },
  ];

  $('#statsRow').html(
    stats
      .map(
        (s) => `
      <div class="col-6 col-lg-3">
        <div class="ob-card-flat stat-card fade-in">
          <div class="label"><i class="bi ${s.icon}"></i>${s.label}</div>
          <div class="value tabular">${s.value}</div>
          <div class="hint">${s.hint}</div>
        </div>
      </div>`
      )
      .join('')
  );
}

function renderClassrooms() {
  const filtered = activeCategory === 'all' ? allClassrooms : allClassrooms.filter((c) => c.category === activeCategory);

  if (!filtered.length) {
    $('#classroomGrid').html(`
      <div class="col-12">
        <div class="empty-state">
          <div class="t">${allClassrooms.length ? 'No classrooms in this category' : 'No classrooms yet'}</div>
          <div>${allClassrooms.length ? 'Pick another category.' : 'Ask your teacher for the class code, then join here.'}</div>
          <button class="btn btn-brand mt-3" data-bs-toggle="modal" data-bs-target="#joinClassroomModal"><i class="bi bi-plus-lg"></i>Join a classroom</button>
        </div>
      </div>`);
    return;
  }

  $('#classroomGrid').html(
    filtered
      .map(
        (c) => `
      <div class="col-md-6 col-xl-4">
        <a href="/classroom.html?id=${c._id}" class="text-reset">
          <div class="card-app hoverable h-100 fade-in" style="padding:18px 20px">
            <div class="d-flex justify-content-between align-items-start mb-3">
              ${categoryBadgeHtml(c.category)}
              <i class="bi bi-arrow-up-right text-faint"></i>
            </div>
            <div style="font-size:15px; font-weight:600; color:var(--color-fg-display); margin-bottom:2px">${esc(c.name)}</div>
            <div class="text-muted" style="font-size:13px">${esc(c.subject) || '&nbsp;'}</div>
            <div class="d-flex align-items-center gap-2 mt-3 pt-3" style="border-top:1px solid var(--color-border-hairline)">
              ${avatarHtml(c.teacher.name, c.teacher.avatarColor, 'sm')}
              <div class="text-muted" style="font-size:13px">${esc(c.teacher.name)}</div>
            </div>
          </div>
        </a>
      </div>`
      )
      .join('')
  );
}

function renderAssignments() {
  const search = $('#assignmentSearch').val().trim().toLowerCase();
  const filtered = allAssignments.filter((a) => {
    const matchesCategory = activeCategory === 'all' || a.category === activeCategory;
    const matchesSearch = !search || a.title.toLowerCase().includes(search) || a.classroomName.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });

  if (!filtered.length) {
    $('#assignmentTableBody').html('');
    $('#assignmentEmptyState').removeClass('d-none');
    return;
  }
  $('#assignmentEmptyState').addClass('d-none');

  $('#assignmentTableBody').html(
    filtered
      .map(
        (a) => `
      <tr class="clickable" onclick="window.location.href='/assignment.html?id=${a._id}'">
        <td>
          <div style="font-weight:500">${esc(a.title)}</div>
          <div class="text-muted" style="font-size:12px">${esc(a.stage)}</div>
        </td>
        <td class="text-muted">${esc(a.classroomName)}</td>
        <td>${categoryBadgeHtml(a.category)}</td>
        <td><div class="tabular">${formatDate(a.deadline)}</div><div class="text-muted" style="font-size:12px">${timeUntil(a.deadline)}</div></td>
        <td>${statusBadgeHtml(a.computedStatus)}${a.mySubmission && a.mySubmission.marks !== null ? ` <span class="tabular ms-1" style="font-weight:600; font-size:13px">${a.mySubmission.marks}/${a.maxMarks}</span>` : ''}</td>
        <td class="text-end"><i class="bi bi-chevron-right text-faint"></i></td>
      </tr>`
      )
      .join('')
  );
}

function wireEvents() {
  $('#categoryPills .nav-link').on('click', function () {
    $('#categoryPills .nav-link').removeClass('active');
    $(this).addClass('active');
    activeCategory = $(this).data('cat');
    renderClassrooms();
    renderAssignments();
  });

  $('#assignmentSearch').on('keyup', renderAssignments);

  $('#joinForm').on('submit', (e) => e.preventDefault());
  $('#joinSubmitBtn').on('click', async function () {
    const code = $('#classCodeInput').val().trim();
    $('#joinAlert').addClass('d-none');
    if (!code) return;

    const $btn = $(this);
    $btn.prop('disabled', true).html('Joining... <span class="spinner-border spinner-border-sm"></span>');
    try {
      const { classroom } = await Api.post('/classrooms/join', { code });
      bootstrap.Modal.getInstance(document.getElementById('joinClassroomModal')).hide();
      $('#classCodeInput').val('');
      showToast(`Joined "${classroom.name}" successfully!`, 'success');
      await loadDashboard();
    } catch (err) {
      $('#joinAlert').removeClass('d-none').text(err.message);
    } finally {
      $btn.prop('disabled', false).text('Join classroom');
    }
  });
}
