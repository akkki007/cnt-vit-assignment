const params = new URLSearchParams(window.location.search);
const classroomId = params.get('id');

let classroomData = null;
let isTeacher = false;
let assignments = [];
let resources = [];
let projects = [];

$(async function () {
  if (!Auth.requireAuth()) return;
  if (!classroomId) {
    window.location.href = '/';
    return;
  }
  const user = Auth.getUser();
  $('#dashboardLink, #backLink').attr('href', user.role === 'teacher' ? '/teacher-dashboard.html' : '/student-dashboard.html');

  await loadClassroom();
});

async function loadClassroom() {
  try {
    const res = await Api.get(`/classrooms/${classroomId}`);
    classroomData = res.classroom;
    isTeacher = res.isTeacher;
    renderShell();
    await Promise.all([loadAssignments(), loadResources(), loadProjects()]);
    renderStream();
  } catch (err) {
    $('#classroomContent').html(`<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><div>${esc(err.message)}</div></div>`);
  }
}

function renderShell() {
  const meta = CATEGORY_META[classroomData.category];
  document.title = `${classroomData.name} — VIT ProjectHub`;
  $('#crumbTitle').text(classroomData.name);

  $('#classroomContent').html(`
    <div class="page-header fade-in">
      <div style="min-width:0">
        <div class="ob-eyebrow">${meta.full}</div>
        <h1>${esc(classroomData.name)}</h1>
        <p>${esc([classroomData.subject, classroomData.description].filter(Boolean).join(' · '))}</p>
      </div>
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <div class="d-flex align-items-center gap-2">
          ${avatarHtml(classroomData.teacher.name, classroomData.teacher.avatarColor, '')}
          <div style="font-size:13px; line-height:1.35"><div style="font-weight:500">${esc(classroomData.teacher.name)}</div><div class="text-muted">${esc(classroomData.teacher.department || 'Faculty')}</div></div>
        </div>
        ${isTeacher ? `<div class="class-code-box" title="Class code">${classroomData.code} <i class="bi bi-copy clickable" id="copyCodeBtn" title="Copy code"></i></div>` : `<span class="ob-pill pill-gray"><i class="bi bi-people"></i>${classroomData.students.length} students</span>`}
      </div>
    </div>

    <div class="mb-4">
      <ul class="nav nav-pills" id="classroomTabs" role="tablist">
        <li class="nav-item"><button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tab-stream" type="button"><i class="bi bi-house-door"></i>Stream</button></li>
        <li class="nav-item"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-assignments" type="button"><i class="bi bi-journal-text"></i>Assignments</button></li>
        <li class="nav-item"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-resources" type="button"><i class="bi bi-folder2-open"></i>Resources</button></li>
        <li class="nav-item"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-projects" type="button"><i class="bi bi-kanban"></i>Projects</button></li>
        <li class="nav-item"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-people" type="button"><i class="bi bi-people"></i>People</button></li>
      </ul>
    </div>

    <div class="tab-content">
      <div class="tab-pane fade show active" id="tab-stream"></div>
      <div class="tab-pane fade" id="tab-assignments"></div>
      <div class="tab-pane fade" id="tab-resources"></div>
      <div class="tab-pane fade" id="tab-projects"></div>
      <div class="tab-pane fade" id="tab-people"></div>
    </div>
  `);

  $('#copyCodeBtn').on('click', function () {
    navigator.clipboard.writeText(classroomData.code);
    showToast('Class code copied to clipboard!', 'success');
  });

  const requestedTab = params.get('tab');
  if (requestedTab && document.querySelector(`[data-bs-target="#tab-${requestedTab}"]`)) {
    bootstrap.Tab.getOrCreateInstance(document.querySelector(`[data-bs-target="#tab-${requestedTab}"]`)).show();
  }

  const stages = STAGES_BY_CATEGORY[classroomData.category] || ['Assignment'];
  $('#aStage, #pStage').html(stages.map((s) => `<option value="${s}">${s}</option>`).join(''));
}

async function loadAssignments() {
  const { assignments: list } = await Api.get(`/assignments/classroom/${classroomId}`);
  assignments = list;
  renderAssignmentsTab();
}

async function loadResources() {
  const { resources: list } = await Api.get(`/resources/classroom/${classroomId}`);
  resources = list;
  renderResourcesTab();
}

async function loadProjects() {
  const { projects: list } = await Api.get(`/projects/classroom/${classroomId}`);
  projects = list;
  renderProjectsTab();
}

function renderStream() {
  const activity = [
    ...assignments.map((a) => ({ type: 'assignment', date: a.createdAt, title: a.title, sub: `New assignment · ${esc(a.stage)}`, id: a._id })),
    ...resources.map((r) => ({ type: 'resource', date: r.createdAt, title: r.title, sub: `Resource uploaded by ${esc(r.uploadedBy.name)}`, id: null })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const actions = isTeacher
    ? `
      <button class="btn btn-brand" data-bs-toggle="modal" data-bs-target="#createAssignmentModal"><i class="bi bi-plus-lg"></i>New assignment</button>
      <button class="btn btn-soft" data-bs-toggle="modal" data-bs-target="#uploadResourceModal"><i class="bi bi-upload"></i>Upload resource</button>`
    : `<button class="btn btn-soft" data-bs-toggle="modal" data-bs-target="#addProjectModal"><i class="bi bi-plus-lg"></i>Register project</button>`;

  $('#tab-stream').html(`
    <div class="section-title">
      <h3>Recent activity</h3>
      <div class="d-flex gap-2 flex-wrap">${actions}</div>
    </div>
    ${
      activity.length
        ? `<div class="card-app overflow-hidden">${activity
            .slice(0, 10)
            .map(
              (a) => `
        <div class="activity-row ${a.id ? 'clickable' : ''}" ${a.id ? `onclick="window.location.href='/assignment.html?id=${a.id}'"` : ''}>
          <span class="icon-tile ${a.type === 'assignment' ? 'blue' : 'yellow'}"><i class="bi ${a.type === 'assignment' ? 'bi-journal-text' : 'bi-file-earmark-arrow-down'}"></i></span>
          <div class="flex-grow-1 overflow-hidden">
            <div class="text-truncate" style="font-size:14px; font-weight:500">${esc(a.title)}</div>
            <div class="text-muted" style="font-size:12px">${a.sub}</div>
          </div>
          <div class="text-muted tabular" style="font-size:12px; white-space:nowrap">${formatDate(a.date)}</div>
        </div>`
            )
            .join('')}</div>`
        : `<div class="empty-state"><i class="bi bi-activity"></i><div class="t">No activity yet</div><div>New assignments and resources will show up here.</div></div>`
    }
  `);
}

function renderAssignmentsTab() {
  const createBtn = `<div class="section-title"><h3>Assignments</h3>${isTeacher ? `<button class="btn btn-brand" data-bs-toggle="modal" data-bs-target="#createAssignmentModal"><i class="bi bi-plus-lg"></i>New assignment</button>` : ''}</div>`;

  if (!assignments.length) {
    $('#tab-assignments').html(`${createBtn}<div class="empty-state"><i class="bi bi-journal-x"></i><div class="t">No assignments yet</div><div>${isTeacher ? 'Post the first assignment for this classroom.' : 'Your teacher has not posted any assignments.'}</div></div>`);
    return;
  }

  $('#tab-assignments').html(`
    ${createBtn}
    <div class="row g-3">
      ${assignments
        .map((a) => {
          const status = isTeacher ? null : a.computedStatus;
          return `
        <div class="col-md-6">
          <div class="card-app hoverable h-100 clickable d-flex flex-column" style="padding:18px 20px" onclick="window.location.href='/assignment.html?id=${a._id}'">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <span class="stage-chip current">${esc(a.stage)}</span>
              ${isTeacher ? `<span class="ob-pill pill-gray tabular">${a.submissionCount || 0}/${a.totalStudents || 0} submitted</span>` : statusBadgeHtml(status)}
            </div>
            <div style="font-size:15px; font-weight:600; color:var(--color-fg-display); margin-bottom:4px">${esc(a.title)}</div>
            <p class="text-muted line-clamp-2 flex-grow-1" style="font-size:13px; line-height:1.55; margin-bottom:12px">${esc(a.description)}</p>
            <div class="d-flex justify-content-between align-items-center pt-3" style="border-top:1px solid var(--color-border-hairline); font-size:13px">
              <span class="text-muted"><i class="bi bi-calendar-event me-1"></i>${formatDate(a.deadline)}</span>
              <span style="font-weight:500">${a.maxMarks} marks</span>
            </div>
          </div>
        </div>`;
        })
        .join('')}
    </div>
  `);
}

function renderResourcesTab() {
  const uploadBtn = `<div class="section-title"><h3>Resources</h3>${isTeacher ? `<button class="btn btn-brand" data-bs-toggle="modal" data-bs-target="#uploadResourceModal"><i class="bi bi-upload"></i>Upload resource</button>` : ''}</div>`;

  if (!resources.length) {
    $('#tab-resources').html(`${uploadBtn}<div class="empty-state"><i class="bi bi-folder2-open"></i><div class="t">No resources yet</div><div>Slides, templates and reading material will appear here.</div></div>`);
    return;
  }

  $('#tab-resources').html(`
    ${uploadBtn}
    <div class="row g-3">
      ${resources
        .map(
          (r) => `
        <div class="col-md-6 col-lg-4">
          <div class="ob-card-flat h-100 d-flex flex-column" style="padding:18px 20px">
            <div class="d-flex align-items-center gap-3 mb-2">
              <span class="icon-tile"><i class="bi bi-file-earmark-text"></i></span>
              <div class="overflow-hidden">
                <div class="text-truncate" style="font-size:14px; font-weight:500">${esc(r.title)}</div>
                <div class="text-muted" style="font-size:12px">by ${esc(r.uploadedBy.name)}</div>
              </div>
            </div>
            <p class="text-muted flex-grow-1" style="font-size:13px; line-height:1.55">${esc(r.description)}</p>
            <a href="${r.file.path}" target="_blank" class="btn btn-soft btn-sm w-100"><i class="bi bi-download"></i>Download</a>
          </div>
        </div>`
        )
        .join('')}
    </div>
  `);
}

function renderProjectsTab() {
  const addBtn = `<div class="section-title"><h3>Projects</h3><button class="btn btn-brand" data-bs-toggle="modal" data-bs-target="#addProjectModal"><i class="bi bi-plus-lg"></i>Register project</button></div>`;

  if (!projects.length) {
    $('#tab-projects').html(`${addBtn}<div class="empty-state"><i class="bi bi-kanban"></i><div class="t">No projects yet</div><div>Register a project to track it through each stage.</div></div>`);
    return;
  }

  $('#tab-projects').html(`
    ${addBtn}
    <div class="row g-3">
      ${projects
        .map((p) => {
          const stages = STAGES_BY_CATEGORY[p.category] || ['Assignment'];
          const currentIdx = stages.indexOf(p.currentStage);
          return `
        <div class="col-md-6">
          <div class="ob-card-flat h-100 d-flex flex-column" style="padding:18px 20px">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <div style="font-size:15px; font-weight:600; color:var(--color-fg-display)">${esc(p.title)}</div>
              <span class="status-badge ${p.status === 'completed' ? 'graded' : 'submitted'} text-capitalize">${p.status}</span>
            </div>
            <p class="text-muted flex-grow-1" style="font-size:13px; line-height:1.55">${esc(p.problemStatement)}</p>
            <div class="stage-track mb-3">
              ${stages.map((s, i) => `<span class="stage-chip ${i < currentIdx ? 'done' : i === currentIdx ? 'current' : ''}">${s}</span>`).join('')}
            </div>
            <div class="d-flex align-items-center gap-1 pt-3" style="border-top:1px solid var(--color-border-hairline)">
              ${p.teamMembers.map((m) => avatarHtml(m.name, m.avatarColor, 'sm')).join('')}
              <span class="text-muted ms-2" style="font-size:12px">Mentor: ${esc(p.mentor ? p.mentor.name : 'Unassigned')}</span>
            </div>
          </div>
        </div>`;
        })
        .join('')}
    </div>
  `);
}

function renderPeopleTab() {
  $('#tab-people').html(`
    <div class="section-label mb-2">Teacher</div>
    <div class="ob-card-flat mb-4" style="padding:14px 16px">
      <div class="d-flex align-items-center gap-3">
        ${avatarHtml(classroomData.teacher.name, classroomData.teacher.avatarColor, '')}
        <div>
          <div style="font-weight:500">${esc(classroomData.teacher.name)}</div>
          <div class="text-muted" style="font-size:13px">${esc(classroomData.teacher.email)}</div>
        </div>
      </div>
    </div>
    <div class="section-label mb-2">Students · ${classroomData.students.length}</div>
    <div class="ob-card-flat" style="padding:4px 16px">
      ${
        classroomData.students.length
          ? classroomData.students
              .map(
                (s) => `
        <div class="d-flex align-items-center gap-3 py-2 kv-row" style="border-top-color:var(--color-border-hairline)">
          ${avatarHtml(s.name, s.avatarColor, 'sm')}
          <div class="flex-grow-1 overflow-hidden">
            <div style="font-size:14px; font-weight:500">${esc(s.name)}</div>
            <div class="text-muted text-truncate" style="font-size:12px">${esc(s.email)} ${s.regNo ? '· ' + esc(s.regNo) : ''}</div>
          </div>
          ${isTeacher ? `<button class="btn btn-sm btn-outline-danger btn-icon remove-student-btn" data-id="${s._id}" title="Remove student"><i class="bi bi-x-lg"></i></button>` : ''}
        </div>`
              )
              .join('')
          : `<div class="text-muted py-3" style="font-size:13px">No students have joined yet.</div>`
      }
    </div>
  `);

  $('.remove-student-btn').on('click', async function () {
    if (!confirm('Remove this student from the classroom?')) return;
    const studentId = $(this).data('id');
    try {
      await Api.delete(`/classrooms/${classroomId}/students/${studentId}`);
      showToast('Student removed.', 'success');
      await loadClassroom();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

$(document).on('shown.bs.tab', '[data-bs-target="#tab-people"]', renderPeopleTab);

/* ---------------- Create Assignment ---------------- */
$(document).on('click', '#assignSubmitBtn', async function () {
  $('#assignAlert').addClass('d-none');
  const title = $('#aTitle').val().trim();
  const description = $('#aDescription').val().trim();
  const deadline = $('#aDeadline').val();
  if (!title || !description || !deadline) {
    $('#assignForm').addClass('was-validated');
    return;
  }

  const $btn = $(this);
  $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>Creating');
  try {
    await Api.post(`/assignments/classroom/${classroomId}`, {
      title,
      description,
      stage: $('#aStage').val(),
      maxMarks: Number($('#aMaxMarks').val()),
      deadline: new Date(deadline).toISOString(),
    });
    bootstrap.Modal.getInstance(document.getElementById('createAssignmentModal')).hide();
    $('#assignForm')[0].reset();
    showToast('Assignment created!', 'success');
    await loadAssignments();
    renderStream();
  } catch (err) {
    $('#assignAlert').removeClass('d-none').text(err.message);
  } finally {
    $btn.prop('disabled', false).text('Create assignment');
  }
});

/* ---------------- Upload Resource ---------------- */
$(document).on('click', '#resourceDropzone', () => $('#rFile').click());
$(document).on('change', '#rFile', function () {
  const file = this.files[0];
  if (file) $('#resourceFileLabel').text(file.name);
});

$(document).on('click', '#resourceSubmitBtn', async function () {
  $('#resourceAlert').addClass('d-none');
  const title = $('#rTitle').val().trim();
  const file = $('#rFile')[0].files[0];
  if (!title || !file) {
    $('#resourceForm').addClass('was-validated');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', $('#rDescription').val().trim());
  formData.append('file', file);

  const $btn = $(this);
  $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>Uploading');
  try {
    await Api.post(`/resources/classroom/${classroomId}`, formData, true);
    bootstrap.Modal.getInstance(document.getElementById('uploadResourceModal')).hide();
    $('#resourceForm')[0].reset();
    $('#resourceFileLabel').text('Click to choose a file or drag it here');
    showToast('Resource uploaded!', 'success');
    await loadResources();
    renderStream();
  } catch (err) {
    $('#resourceAlert').removeClass('d-none').text(err.message);
  } finally {
    $btn.prop('disabled', false).text('Upload');
  }
});

/* ---------------- Add Project ---------------- */
$(document).on('click', '#projectSubmitBtn', async function () {
  $('#projectAlert').addClass('d-none');
  const title = $('#pTitle').val().trim();
  const problem = $('#pProblem').val().trim();
  if (!title || !problem) {
    $('#projectForm').addClass('was-validated');
    return;
  }

  const $btn = $(this);
  $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>Saving');
  try {
    await Api.post(`/projects/classroom/${classroomId}`, {
      title,
      problemStatement: problem,
      currentStage: $('#pStage').val(),
    });
    bootstrap.Modal.getInstance(document.getElementById('addProjectModal')).hide();
    $('#projectForm')[0].reset();
    showToast('Project registered!', 'success');
    await loadProjects();
  } catch (err) {
    $('#projectAlert').removeClass('d-none').text(err.message);
  } finally {
    $btn.prop('disabled', false).text('Register project');
  }
});
