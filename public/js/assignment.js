const assignmentId = new URLSearchParams(window.location.search).get('id');
let assignmentData = null;
let classroomData = null;
let isTeacher = false;
let selectedFiles = [];

$(async function () {
  if (!Auth.requireAuth()) return;
  if (!assignmentId) { window.location.href = '/'; return; }
  const user = Auth.getUser();
  $('#dashboardLink').attr('href', user.role === 'teacher' ? '/teacher-dashboard.html' : '/student-dashboard.html');

  await load();
});

async function load() {
  try {
    const res = await Api.get(`/assignments/${assignmentId}`);
    assignmentData = res.assignment;
    classroomData = res.classroom;
    isTeacher = res.isTeacher;
    $('#classroomLink, #backLink').attr('href', `/classroom.html?id=${classroomData._id}`);
    $('#crumbTitle').text(assignmentData.title);
    document.title = `${assignmentData.title} — VIT ProjectHub`;
    render();
  } catch (err) {
    $('#assignmentContent').html(`<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><div>${esc(err.message)}</div></div>`);
  }
}

function renderHeader() {
  const a = assignmentData;
  const overdue = new Date(a.deadline) < new Date();
  return `
    <div class="page-header fade-in">
      <div style="min-width:0">
        <div class="ob-eyebrow">${esc(classroomData.name)}</div>
        <h1>${esc(a.title)}</h1>
        <div class="d-flex align-items-center gap-2 flex-wrap mt-2">
          ${categoryBadgeHtml(a.category)}
          <span class="stage-chip current">${esc(a.stage)}</span>
        </div>
      </div>
    </div>

    <div class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="ob-card-flat h-100" style="padding:22px 24px">
          <div class="section-label mb-2">Requirements</div>
          <p style="white-space:pre-wrap; font-size:14px; line-height:1.65; margin:0">${esc(a.description)}</p>
          ${
            a.resources && a.resources.length
              ? `<div class="section-label mt-4 mb-2">Attached resources</div>
                 <div class="d-flex flex-wrap gap-1">
                 ${a.resources.map((r) => `<a href="${r.file.path}" target="_blank" class="file-chip"><i class="bi bi-paperclip"></i>${esc(r.title)}</a>`).join('')}
                 </div>`
              : ''
          }
        </div>
      </div>
      <div class="col-lg-4">
        <div class="ob-card-flat h-100" style="padding:18px 20px">
          <div class="section-label mb-2">Details</div>
          <div class="kv-row"><span class="k">Deadline</span><span class="v">${formatDateTime(a.deadline)}</span></div>
          <div class="kv-row"><span class="k">Time left</span><span class="v"><span class="ob-pill ${overdue ? 'pill-red' : 'pill-blue'}">${timeUntil(a.deadline)}</span></span></div>
          <div class="kv-row"><span class="k">Max marks</span><span class="v">${a.maxMarks}</span></div>
          <div class="kv-row"><span class="k">Stage</span><span class="v">${esc(a.stage)}</span></div>
        </div>
      </div>
    </div>
  `;
}

function render() {
  $('#assignmentContent').html(renderHeader() + `<div id="submissionArea"></div>`);
  if (isTeacher) {
    renderTeacherRoster();
  } else {
    renderStudentSubmission();
  }
}

/* ---------------- Teacher: roster ---------------- */
async function renderTeacherRoster() {
  $('#submissionArea').html(`
    <div class="section-title">
      <h3>Submissions</h3>
      <div class="search-box">
        <i class="bi bi-search"></i>
        <input type="text" class="form-control" id="rosterSearch" placeholder="Search students">
      </div>
    </div>
    <div class="card-app overflow-hidden">
      <div class="table-responsive">
        <table class="table table-app align-middle mb-0">
          <thead><tr><th>Student</th><th>Status</th><th>Submitted</th><th>Marks</th><th></th></tr></thead>
          <tbody id="rosterBody"><tr><td colspan="5" class="text-center py-4"><div class="spinner-border spinner-border-sm"></div></td></tr></tbody>
        </table>
      </div>
    </div>
  `);

  try {
    const { roster } = await Api.get(`/submissions/assignment/${assignmentId}/roster`);
    window._roster = roster;
    paintRoster(roster);
    $('#rosterSearch').on('keyup', function () {
      const q = $(this).val().toLowerCase();
      paintRoster(roster.filter((r) => r.student.name.toLowerCase().includes(q) || r.student.email.toLowerCase().includes(q)));
    });
  } catch (err) {
    $('#rosterBody').html(`<tr><td colspan="5" class="text-center text-danger py-4">${esc(err.message)}</td></tr>`);
  }
}

function paintRoster(roster) {
  if (!roster.length) {
    $('#rosterBody').html(`<tr><td colspan="5" class="text-center text-muted py-4">No students enrolled yet.</td></tr>`);
    return;
  }
  $('#rosterBody').html(
    roster
      .map(({ student, submission }) => {
        const status = submission ? submission.status : (new Date(assignmentData.deadline) < new Date() ? 'missed' : 'pending');
        return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${avatarHtml(student.name, student.avatarColor, 'sm')}
            <div><div style="font-weight:500">${esc(student.name)}</div><div class="text-muted" style="font-size:12px">${esc(student.regNo || student.email)}</div></div>
          </div>
        </td>
        <td>${statusBadgeHtml(status)}</td>
        <td class="text-muted tabular">${submission ? formatDateTime(submission.submittedAt) : '—'}</td>
        <td class="tabular" style="font-weight:500">${submission && submission.marks !== null ? `${submission.marks}/${assignmentData.maxMarks}` : '—'}</td>
        <td class="text-end">
          ${submission ? `<a href="/submission.html?id=${submission._id}" class="btn btn-sm btn-soft">${submission.status === 'graded' ? 'View' : 'Grade'}</a>` : `<span class="text-faint" style="font-size:13px">Not submitted</span>`}
        </td>
      </tr>`;
      })
      .join('')
  );
}

/* ---------------- Student: submission ---------------- */
async function renderStudentSubmission() {
  $('#submissionArea').html(`<div class="text-center py-4"><div class="spinner-border spinner-border-sm"></div></div>`);
  try {
    const { submission } = await Api.get(`/submissions/assignment/${assignmentId}/mine`);
    paintStudentSubmission(submission);
  } catch (err) {
    $('#submissionArea').html(`<div class="alert alert-danger">${esc(err.message)}</div>`);
  }
}

function paintStudentSubmission(submission) {
  const overdue = new Date(assignmentData.deadline) < new Date();

  let gradedBlock = '';
  if (submission && submission.status === 'graded') {
    gradedBlock = `
      <div class="ob-card-flat grade-card mb-4" style="padding:18px 22px">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="ob-pill pill-green" style="background:var(--color-bg-elevated)"><i class="bi bi-award"></i>Graded</span>
          <span class="score tabular">${submission.marks}<span class="text-muted" style="font-size:16px"> / ${assignmentData.maxMarks}</span></span>
        </div>
        <div class="section-label mt-2 mb-1">Feedback</div>
        <p class="mb-0" style="font-size:14px; line-height:1.6">${esc(submission.feedback) || 'No written feedback provided.'}</p>
      </div>`;
  }

  const filesBlock = submission && submission.files.length
    ? `<div class="d-flex flex-wrap gap-1 mb-3">${submission.files.map((f) => `<a href="${f.path}" target="_blank" class="file-chip"><i class="bi bi-file-earmark-arrow-down"></i>${esc(f.originalName)}</a>`).join('')}</div>`
    : '';

  $('#submissionArea').html(`
    ${gradedBlock}
    <div class="ob-card-flat" style="padding:22px 24px">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0" style="font-size:18px">${submission ? 'Your submission' : 'Submit your work'}</h3>
        ${submission ? statusBadgeHtml(submission.status) : ''}
      </div>
      ${submission ? `<div class="text-muted mb-2" style="font-size:13px">Submitted ${formatDateTime(submission.submittedAt)}</div>${filesBlock}${submission.note ? `<p class="text-muted" style="font-size:13px">"${esc(submission.note)}"</p>` : ''}` : ''}

      ${
        submission && submission.status === 'graded'
          ? `<div class="text-muted" style="font-size:13px"><i class="bi bi-lock me-1"></i>This submission has been graded and can no longer be edited.</div>`
          : `
        <hr>
        <div class="d-flex align-items-center gap-2 mb-2 flex-wrap"><span class="section-label">${submission ? 'Resubmit' : 'Upload files'}</span>${overdue ? '<span class="ob-pill pill-red">Deadline passed · will be marked late</span>' : ''}</div>
        <div id="submitAlert" class="alert alert-danger d-none"></div>
        <form id="submitForm" novalidate>
          <div class="dropzone mb-3" id="submitDropzone">
            <i class="bi bi-cloud-upload fs-4 d-block mb-2"></i>
            <span>Click to choose files or drag them here</span>
            <input type="file" id="submitFiles" class="d-none" multiple>
          </div>
          <div id="fileChipList" class="mb-3"></div>
          <div class="mb-3">
            <label class="form-label">Note (optional)</label>
            <textarea class="form-control" id="submitNote" rows="2" placeholder="Any comments for your teacher">${submission ? esc(submission.note) : ''}</textarea>
          </div>
          <button type="button" class="btn btn-brand" id="submitBtn"><i class="bi bi-send"></i>${submission ? 'Resubmit' : 'Submit assignment'}</button>
        </form>`
      }
    </div>
  `);

  selectedFiles = [];
  $('#submitDropzone').on('click', () => $('#submitFiles').click());
  $('#submitDropzone').on('dragover', function (e) { e.preventDefault(); $(this).addClass('dragover'); });
  $('#submitDropzone').on('dragleave', function () { $(this).removeClass('dragover'); });
  $('#submitDropzone').on('drop', function (e) {
    e.preventDefault();
    $(this).removeClass('dragover');
    addFiles(e.originalEvent.dataTransfer.files);
  });
  $('#submitFiles').on('change', function () { addFiles(this.files); });

  $('#submitBtn').on('click', doSubmit);
}

function addFiles(fileList) {
  Array.from(fileList).forEach((f) => selectedFiles.push(f));
  renderFileChips();
}

function renderFileChips() {
  $('#fileChipList').html(
    selectedFiles
      .map(
        (f, i) => `<span class="file-chip"><i class="bi bi-file-earmark"></i>${esc(f.name)} <i class="bi bi-x clickable remove-file" data-i="${i}" title="Remove"></i></span>`
      )
      .join('')
  );
  $('.remove-file').on('click', function () {
    selectedFiles.splice($(this).data('i'), 1);
    renderFileChips();
  });
}

async function doSubmit() {
  $('#submitAlert').addClass('d-none');
  if (!selectedFiles.length) {
    $('#submitAlert').removeClass('d-none').text('Please attach at least one file.');
    return;
  }

  const formData = new FormData();
  selectedFiles.forEach((f) => formData.append('files', f));
  formData.append('note', $('#submitNote').val().trim());

  const $btn = $('#submitBtn');
  $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>Submitting');
  try {
    await Api.post(`/submissions/assignment/${assignmentId}`, formData, true);
    showToast('Assignment submitted successfully!', 'success');
    await renderStudentSubmission();
  } catch (err) {
    $('#submitAlert').removeClass('d-none').text(err.message);
    $btn.prop('disabled', false).html('<i class="bi bi-send"></i>Submit assignment');
  }
}
