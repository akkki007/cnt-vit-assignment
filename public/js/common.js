/* Shared UI helpers: toasts, category metadata, date formatting, navbar/notification wiring. */

const CATEGORY_META = {
  SDP: { label: 'SDP', full: 'Software Development Project', icon: 'bi-code-slash', cls: 'cat-sdp', tone: 'blue' },
  EDI: { label: 'EDI', full: 'Engineering Design & Innovation', icon: 'bi-lightbulb', cls: 'cat-edi', tone: 'purple' },
  DT: { label: 'DT', full: 'Design Thinking', icon: 'bi-palette', cls: 'cat-dt', tone: 'green' },
  'Course Project': { label: 'Course Project', full: 'Course Projects', icon: 'bi-journal-bookmark', cls: 'cat-course', tone: 'yellow' },
};

const STAGES_BY_CATEGORY = {
  SDP: ['Requirements', 'Design', 'Development', 'Testing'],
  EDI: ['Research', 'Ideation', 'Design', 'Prototype'],
  DT: ['Empathize', 'Define', 'Ideate', 'Prototype', 'Test'],
  'Course Project': ['Assignment'],
};

function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function categoryBadgeHtml(category) {
  const meta = CATEGORY_META[category] || CATEGORY_META['Course Project'];
  return `<span class="category-badge ${meta.cls}"><i class="bi ${meta.icon}"></i>${meta.label}</span>`;
}

function statusBadgeHtml(status) {
  const labels = { pending: 'Pending', submitted: 'Submitted', late: 'Late', missed: 'Missed', graded: 'Graded' };
  return `<span class="status-badge ${status}">${labels[status] || status}</span>`;
}

function initialsOf(name) {
  return (name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function avatarHtml(name, color, size = '') {
  const sizeCls = size ? `avatar-circle ${size}` : 'avatar-circle';
  const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(color || '') ? color : '#0b6e99';
  return `<div class="${sizeCls}" style="background:${safeColor}">${esc(initialsOf(name))}</div>`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatDateTime(d) {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function timeUntil(d) {
  const diff = new Date(d) - new Date();
  const abs = Math.abs(diff);
  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const label = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  return diff >= 0 ? `Due in ${label}` : `${label} overdue`;
}

/* ---------------- Toasts ---------------- */
function ensureToastContainer() {
  let el = document.getElementById('toastContainer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastContainer';
    el.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    el.style.zIndex = 1080;
    document.body.appendChild(el);
  }
  return el;
}

function showToast(message, type = 'success') {
  const icons = { success: 'bi-check-circle-fill text-success', danger: 'bi-x-circle-fill text-danger', warning: 'bi-exclamation-triangle-fill text-warning', info: 'bi-info-circle-fill text-info' };
  const container = ensureToastContainer();
  const id = `toast-${Date.now()}`;
  const html = `
    <div id="${id}" class="toast align-items-center border-0" role="alert" data-bs-delay="4000">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icons[type] || icons.info}"></i>
          <span>${esc(message)}</span>
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', html);
  const toastEl = document.getElementById(id);
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

/* ---------------- Navbar / sidebar wiring ---------------- */
function wireLogout() {
  $(document).on('click', '#logoutBtn', function (e) {
    e.preventDefault();
    Auth.logout();
  });
}

function wireSidebarToggle() {
  $(document).on('click', '#sidebarToggle', function () {
    $('#sidebar').toggleClass('show');
    $('#sidebarBackdrop').toggleClass('show');
  });
  $(document).on('click', '#sidebarBackdrop', function () {
    $('#sidebar').removeClass('show');
    $('#sidebarBackdrop').removeClass('show');
  });
}

function populateUserChrome() {
  const user = Auth.getUser();
  if (!user) return;
  $('.js-user-name').text(user.name);
  $('.js-user-role').text(user.role === 'teacher' ? 'Faculty' : 'Student');
  $('.js-user-avatar').html(avatarHtml(user.name, user.avatarColor, 'sm'));
  $('.js-user-avatar-lg').html(avatarHtml(user.name, user.avatarColor, ''));
}

async function loadNotifications() {
  const $list = $('#notifList');
  const $badge = $('#notifBadge');
  if (!$list.length) return;
  try {
    const { notifications, unreadCount } = await Api.get('/notifications');
    if (unreadCount > 0) {
      $badge.text(unreadCount > 9 ? '9+' : unreadCount).removeClass('d-none');
    } else {
      $badge.addClass('d-none');
    }
    if (!notifications.length) {
      $list.html('<div class="text-center text-muted py-4 small"><i class="bi bi-bell-slash d-block mb-1"></i>No notifications yet.</div>');
      return;
    }
    $list.html(
      notifications
        .map(
          (n) => `
        <a href="${n.link || '#'}" class="dropdown-item notif-item ${n.read ? '' : 'unread'}" data-id="${n._id}">
          <div style="font-size:13px; ${n.read ? 'color:var(--color-fg-muted)' : 'font-weight:500'}">${esc(n.message)}</div>
          <div class="text-faint" style="font-size:11px; margin-top:2px">${formatDateTime(n.createdAt)}</div>
        </a>`
        )
        .join('')
    );
  } catch (err) {
    $list.html('<div class="text-center text-muted py-3 small">Could not load notifications.</div>');
  }
}

function wireNotifications() {
  $(document).on('click', '.notif-item', async function () {
    const id = $(this).data('id');
    try { await Api.put(`/notifications/${id}/read`); } catch (e) { /* ignore */ }
  });
  $(document).on('click', '#markAllReadBtn', async function (e) {
    e.preventDefault();
    try {
      await Api.put('/notifications/read-all');
      await loadNotifications();
    } catch (e) { showToast('Could not update notifications', 'danger'); }
  });
}

function initAppChrome() {
  wireLogout();
  wireSidebarToggle();
  wireNotifications();
  populateUserChrome();
  loadNotifications();
  setInterval(loadNotifications, 30000);
}

$(function () {
  if ($('#sidebar').length) initAppChrome();
});
