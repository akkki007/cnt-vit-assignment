const submissionId = new URLSearchParams(window.location.search).get('id');
let submissionData = null;
let canGrade = false;

$(async function () {
  if (!Auth.requireAuth()) return;
  if (!submissionId) { window.location.href = '/'; return; }
  const user = Auth.getUser();
  $('#dashboardLink').attr('href', user.role === 'teacher' ? '/teacher-dashboard.html' : '/student-dashboard.html');

  await load();
});

async function load() {
  try {
    const res = await Api.get(`/submissions/${submissionId}`);
    submissionData = res.submission;
    canGrade = res.canGrade;
    $('#backLink').attr('href', `/assignment.html?id=${submissionData.assignment._id}`);
    render();
  } catch (err) {
    $('#submissionContent').html(`<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><div>${esc(err.message)}</div></div>`);
  }
}

function render() {
  const s = submissionData;
  const a = s.assignment;

  const filesHtml = s.files.length
    ? s.files.map((f) => `<a href="${f.path}" target="_blank" class="file-chip"><i class="bi bi-file-earmark-arrow-down"></i>${esc(f.originalName)} <span class="text-faint tabular">${(f.size / 1024).toFixed(0)} KB</span></a>`).join('')
    : '<span class="text-muted" style="font-size:13px">No files attached.</span>';

  $('#submissionContent').html(`
    <div class="page-header fade-in">
      <div style="min-width:0">
        <div class="ob-eyebrow">Submission review</div>
        <h1>${esc(a.title)}</h1>
        <div class="d-flex align-items-center gap-2 flex-wrap mt-2">
          ${categoryBadgeHtml(a.category)}
          ${statusBadgeHtml(s.status)}
          <span class="ob-pill pill-gray">Max ${a.maxMarks} marks</span>
        </div>
      </div>
    </div>

    <div class="ob-card-flat mb-4" style="padding:22px 24px">
      <div class="d-flex align-items-center gap-3 flex-wrap mb-3">
        ${avatarHtml(s.student.name, s.student.avatarColor, 'lg')}
        <div>
          <div style="font-weight:600; font-size:15px">${esc(s.student.name)}</div>
          <div class="text-muted" style="font-size:13px">${esc(s.student.email)} ${s.student.regNo ? '· ' + esc(s.student.regNo) : ''}</div>
        </div>
        <div class="ms-auto text-end" style="font-size:13px">
          <div class="text-muted">Submitted</div>
          <div class="tabular" style="font-weight:500">${formatDateTime(s.submittedAt)}</div>
        </div>
      </div>
      <div class="section-label mt-4 mb-2">Submitted files</div>
      <div class="d-flex flex-wrap gap-1 mb-3">${filesHtml}</div>
      ${s.note ? `<div class="section-label mt-3 mb-1">Student note</div><p class="mb-0" style="font-size:14px">"${esc(s.note)}"</p>` : ''}
    </div>

    <div id="gradeArea"></div>
  `);

  renderGradeArea();
}

function renderGradeArea() {
  const s = submissionData;
  const a = s.assignment;

  if (canGrade) {
    $('#gradeArea').html(`
      <div class="ob-card" style="padding:22px 24px">
        <div class="d-flex align-items-center gap-2 mb-3">
          <span class="icon-tile"><i class="bi bi-clipboard-check"></i></span>
          <h3 class="mb-0" style="font-size:18px">${s.status === 'graded' ? 'Update grade' : 'Grade this submission'}</h3>
        </div>
        <div id="gradeAlert" class="alert alert-danger d-none"></div>
        <form id="gradeForm" novalidate>
          <div class="mb-3">
            <label class="form-label">Marks (out of ${a.maxMarks})</label>
            <input type="number" class="form-control" id="marksInput" min="0" max="${a.maxMarks}" value="${s.marks !== null ? s.marks : ''}" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Feedback</label>
            <textarea class="form-control" id="feedbackInput" rows="4" placeholder="What went well, and what to improve">${esc(s.feedback)}</textarea>
          </div>
          <button type="button" class="btn btn-brand" id="gradeSubmitBtn"><i class="bi bi-check-lg"></i>${s.status === 'graded' ? 'Update grade' : 'Submit grade'}</button>
        </form>
      </div>
    `);

    $('#gradeSubmitBtn').on('click', async function () {
      $('#gradeAlert').addClass('d-none');
      const marks = $('#marksInput').val();
      if (marks === '' || Number(marks) < 0 || Number(marks) > a.maxMarks) {
        $('#gradeAlert').removeClass('d-none').text(`Please enter marks between 0 and ${a.maxMarks}.`);
        return;
      }
      const $btn = $(this);
      $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>Saving');
      try {
        const { submission } = await Api.put(`/submissions/${submissionId}/grade`, {
          marks: Number(marks),
          feedback: $('#feedbackInput').val().trim(),
        });
        submissionData = { ...submissionData, ...submission };
        showToast('Grade saved!', 'success');
        render();
      } catch (err) {
        $('#gradeAlert').removeClass('d-none').text(err.message);
      } finally {
        $btn.prop('disabled', false).html('<i class="bi bi-check-lg"></i>Submit grade');
      }
    });
  } else {
    // Student view: read-only
    if (s.status === 'graded') {
      $('#gradeArea').html(`
        <div class="ob-card-flat grade-card" style="padding:18px 22px">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="ob-pill pill-green" style="background:var(--color-bg-elevated)"><i class="bi bi-award"></i>Your grade</span>
            <span class="score tabular">${s.marks}<span class="text-muted" style="font-size:16px"> / ${a.maxMarks}</span></span>
          </div>
          <div class="section-label mt-2 mb-1">Feedback</div>
          <p class="mb-0" style="font-size:14px; line-height:1.6">${esc(s.feedback) || 'No written feedback provided.'}</p>
          <div class="text-muted mt-2" style="font-size:12px">Graded by ${esc(s.gradedBy ? s.gradedBy.name : 'teacher')} on ${formatDateTime(s.gradedAt)}</div>
        </div>
      `);
    } else {
      $('#gradeArea').html(`
        <div class="empty-state">
          <i class="bi bi-hourglass-split"></i>
          <div class="t">Not graded yet</div>
          <div>Your teacher hasn't graded this submission. Check back later.</div>
        </div>
      `);
    }
  }
}
