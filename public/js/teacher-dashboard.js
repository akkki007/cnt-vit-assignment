let allClassrooms = [];
let allAssignments = [];
let activeCategory = 'all';

$(async function () {
  if (!Auth.requireRole('teacher')) return;
  await loadDashboard();
  wireEvents();
});

async function loadDashboard() {
  try {
    const { classrooms } = await Api.get('/classrooms');
    allClassrooms = classrooms;
    renderClassrooms();
    await loadAllAssignments();
    renderStats();
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
  } catch (err) {
    showToast('Could not load assignments', 'danger');
  }
}

function renderStats() {
  const totalStudents = new Set(allClassrooms.flatMap((c) => c.students || [])).size;
  const ungraded = allAssignments.reduce((sum, a) => sum + ((a.submissionCount || 0) - (a.gradedCount || 0)), 0);

  const stats = [
    { label: 'Classrooms', value: allClassrooms.length, icon: 'bi-columns-gap', hint: 'Created by you' },
    { label: 'Assignments', value: allAssignments.length, icon: 'bi-journal-text', hint: 'Across all classrooms' },
    { label: 'Students', value: totalStudents, icon: 'bi-people', hint: 'Unique enrolled students' },
    { label: 'To grade', value: ungraded, icon: 'bi-clipboard-check', hint: ungraded ? 'Submissions waiting for marks' : 'All caught up' },
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
          <div>${allClassrooms.length ? 'Pick another category or create a new classroom.' : 'Create a classroom and share its code with your students.'}</div>
          <button class="btn btn-brand mt-3" data-bs-toggle="modal" data-bs-target="#createClassroomModal"><i class="bi bi-plus-lg"></i>Create classroom</button>
        </div>
      </div>`);
    return;
  }

  $('#classroomGrid').html(
    filtered
      .map(
        (c) => `
      <div class="col-md-6 col-xl-4">
        <div class="card-app hoverable h-100 fade-in d-flex flex-column" style="padding:18px 20px">
          <a href="/classroom.html?id=${c._id}" class="text-reset flex-grow-1">
            <div class="d-flex justify-content-between align-items-start mb-3">
              ${categoryBadgeHtml(c.category)}
              <i class="bi bi-arrow-up-right text-faint"></i>
            </div>
            <div style="font-size:15px; font-weight:600; color:var(--color-fg-display); margin-bottom:2px">${esc(c.name)}</div>
            <div class="text-muted" style="font-size:13px">${esc(c.subject) || '&nbsp;'}</div>
          </a>
          <div class="d-flex align-items-center justify-content-between mt-3 pt-3" style="border-top:1px solid var(--color-border-hairline)">
            <div class="text-muted" style="font-size:13px"><i class="bi bi-people me-1"></i>${(c.students || []).length} students</div>
            <span class="class-code-box">${c.code}</span>
          </div>
        </div>
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
      .map((a) => {
        const ungraded = (a.submissionCount || 0) - (a.gradedCount || 0);
        return `
      <tr class="clickable" onclick="window.location.href='/assignment.html?id=${a._id}'">
        <td>
          <div style="font-weight:500">${esc(a.title)}</div>
          <div class="text-muted" style="font-size:12px">${esc(a.stage)}</div>
        </td>
        <td class="text-muted">${esc(a.classroomName)}</td>
        <td>${categoryBadgeHtml(a.category)}</td>
        <td><div class="tabular">${formatDate(a.deadline)}</div><div class="text-muted" style="font-size:12px">${timeUntil(a.deadline)}</div></td>
        <td>
          <span class="tabular" style="font-weight:500">${a.submissionCount || 0}/${a.totalStudents || 0}</span>
          ${ungraded > 0 ? `<span class="status-badge pending ms-1">${ungraded} to grade</span>` : ''}
        </td>
        <td class="text-end"><i class="bi bi-chevron-right text-faint"></i></td>
      </tr>`;
      })
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

  $('#createClassroomForm').on('submit', (e) => e.preventDefault());
  $('#createSubmitBtn').on('click', async function () {
    const form = document.getElementById('createClassroomForm');
    $('#createAlert').addClass('d-none');
    if (!$('#cName').val().trim()) {
      $(form).addClass('was-validated');
      return;
    }

    const $btn = $(this);
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>Creating');
    try {
      const { classroom } = await Api.post('/classrooms', {
        name: $('#cName').val().trim(),
        category: $('#cCategory').val(),
        subject: $('#cSubject').val().trim(),
        description: $('#cDescription').val().trim(),
      });
      bootstrap.Modal.getInstance(document.getElementById('createClassroomModal')).hide();
      $('#createClassroomForm')[0].reset();
      $('#newClassCode').text(classroom.code);
      new bootstrap.Modal(document.getElementById('classCreatedModal')).show();
      await loadDashboard();
    } catch (err) {
      $('#createAlert').removeClass('d-none').text(err.message);
    } finally {
      $btn.prop('disabled', false).html('<i class="bi bi-plus-lg"></i>Create classroom');
    }
  });
}
