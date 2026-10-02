const viewLinks = document.querySelectorAll('[data-view-link]');
const views = document.querySelectorAll('[data-view]');
const breadcrumb = document.querySelector('#breadcrumb-current');
const globalSearch = document.querySelector('#global-search');
const matterDialog = document.querySelector('#matter-dialog');
const matterForm = document.querySelector('#matter-form');
const toast = document.querySelector('#toast');
const toastMessage = document.querySelector('#toast-message');

const initialMatters = [
  { id: 'M-1048', name: 'Northline Studio v. Crest Supply', client: 'Northline Studio', type: 'Commercial litigation', lead: 'Jordan Lee', date: '2026-10-05', status: 'Active' },
  { id: 'M-1046', name: 'Service agreement review', client: 'Meridian Health Group', type: 'Commercial contracts', lead: 'Alex Kim', date: '2026-10-06', status: 'In review' },
  { id: 'M-1042', name: 'Park v. Alder Property Co.', client: 'Alder Property Co.', type: 'Civil litigation', lead: 'Sam Rivera', date: '2026-10-08', status: 'Active' },
  { id: 'M-1038', name: 'Estate plan and trust', client: 'Elena Reyes', type: 'Estate planning', lead: 'Alex Kim', date: '2026-10-09', status: 'Awaiting client' },
  { id: 'M-1031', name: 'Roastery supply agreement', client: 'Fieldstone Coffee Roasters', type: 'Commercial contracts', lead: 'Jordan Lee', date: '2026-10-13', status: 'Active' },
  { id: 'M-1025', name: 'Miller family trust', client: 'Jonah Miller', type: 'Estate planning', lead: 'Alex Kim', date: '2026-09-24', status: 'Closed' },
];

function readAddedMatters() {
  try {
    const storedMatters = JSON.parse(localStorage.getItem('morrow-added-matters') || '[]');
    return Array.isArray(storedMatters) ? storedMatters : [];
  } catch {
    return [];
  }
}

const addedMatters = readAddedMatters();
const matters = [...addedMatters, ...initialMatters];
let activeView = 'overview';
let toastTimer = 0;

function formatDate(dateValue) {
  if (!dateValue) return 'No date set';
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'No date set';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
}

function makeCell(value, className = '') {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  cell.textContent = value;
  return cell;
}

function makeMatterRow(matter, detailed) {
  const row = document.createElement('tr');
  row.className = 'matter-record searchable';
  row.dataset.status = matter.status.toLowerCase();

  const matterCell = document.createElement('td');
  const matterName = document.createElement('span');
  matterName.className = 'matter-name';
  matterName.textContent = matter.name;
  const matterId = document.createElement('span');
  matterId.className = 'matter-id';
  matterId.textContent = matter.id;
  matterCell.append(matterName, matterId);
  row.append(matterCell, makeCell(matter.client));

  if (detailed) {
    row.append(makeCell(matter.type, 'matter-type'), makeCell(matter.lead), makeCell(formatDate(matter.date)));
  } else {
    row.append(makeCell(formatDate(matter.date)));
  }

  const statusCell = document.createElement('td');
  const status = document.createElement('span');
  const statusClass = {
    Active: 'status',
    'In review': 'status status-review',
    'Awaiting client': 'status status-waiting',
    Closed: 'status status-closed',
  }[matter.status] || 'status';
  status.className = statusClass;
  status.textContent = matter.status;
  statusCell.append(status);
  row.append(statusCell);
  return row;
}

function renderMatters() {
  const overviewRows = document.querySelector('[data-table="overview"]');
  const allMatterRows = document.querySelector('[data-table="matters"]');
  overviewRows.replaceChildren(...matters.slice(0, 5).map((matter) => makeMatterRow(matter, false)));
  allMatterRows.replaceChildren(...matters.map((matter) => makeMatterRow(matter, true)));

  const activeCount = matters.filter((matter) => matter.status !== 'Closed').length;
  document.querySelector('#active-matters').textContent = String(activeCount).padStart(2, '0');
  document.querySelector('#nav-matter-count').textContent = String(matters.length).padStart(2, '0');
  document.querySelector('#matter-view-count').textContent = String(matters.length);
  applyFilters();
}

function updateOutstanding() {
  const outstanding = [...document.querySelectorAll('.invoice-row')]
    .filter((row) => !row.querySelector('.status-paid'))
    .reduce((sum, row) => sum + Number(row.querySelector('[data-amount]').dataset.amount), 0);
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(outstanding);
  document.querySelector('#outstanding-total').textContent = formatted;
  document.querySelector('#billing-outstanding').textContent = formatted;
}

function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

function applyFilters() {
  const currentView = document.querySelector(`#view-${activeView}`);
  if (!currentView) return;
  const query = globalSearch.value.trim().toLocaleLowerCase();
  const selectedStatus = activeView === 'matters' ? document.querySelector('#matter-status-filter').value : 'all';
  const searchableRows = [...currentView.querySelectorAll('.searchable, .matter-record, .invoice-row')];

  for (const row of searchableRows) {
    const matchesQuery = row.textContent.toLocaleLowerCase().includes(query);
    const matchesStatus = selectedStatus === 'all' || row.dataset.status === selectedStatus.toLocaleLowerCase();
    row.hidden = !matchesQuery || !matchesStatus;
  }

  const visibleMatterRows = [...currentView.querySelectorAll('.matter-record')].filter((row) => !row.hidden);
  if (activeView === 'matters') {
    document.querySelector('#matter-view-count').textContent = String(visibleMatterRows.length);
    document.querySelector('#matters-empty').hidden = visibleMatterRows.length !== 0;
  }
  if (activeView === 'overview') {
    document.querySelector('#overview-empty').hidden = visibleMatterRows.length !== 0;
  }
  if (activeView === 'clients') {
    const visibleClients = [...currentView.querySelectorAll('.searchable')].filter((row) => !row.hidden);
    document.querySelector('#clients-empty').hidden = visibleClients.length !== 0;
  }
}

function setView(viewName) {
  const target = document.querySelector(`#view-${viewName}`);
  if (!target) return;
  activeView = viewName;
  const title = viewName.charAt(0).toUpperCase() + viewName.slice(1);
  breadcrumb.textContent = title;
  globalSearch.value = '';
  globalSearch.placeholder = `Search ${viewName === 'overview' ? 'this view' : viewName}...`;

  for (const view of views) {
    const isCurrent = view.dataset.view === viewName;
    view.hidden = !isCurrent;
    view.classList.toggle('is-active', isCurrent);
  }
  for (const link of viewLinks) {
    const isCurrent = link.dataset.viewLink === viewName;
    link.classList.toggle('is-active', isCurrent);
    if (isCurrent) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  history.replaceState(null, '', `#${viewName}`);
  applyFilters();
}

for (const link of viewLinks) {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    setView(link.dataset.viewLink);
  });
}

for (const button of document.querySelectorAll('[data-go-view]')) {
  button.addEventListener('click', () => setView(button.dataset.goView));
}

globalSearch.addEventListener('input', applyFilters);
document.querySelector('#matter-status-filter').addEventListener('change', applyFilters);

document.querySelectorAll('[data-open-matter]').forEach((button) => {
  button.addEventListener('click', () => matterDialog.showModal());
});

function closeMatterDialog() {
  matterDialog.close();
  matterForm.reset();
}

document.querySelector('.dialog-close').addEventListener('click', closeMatterDialog);
document.querySelector('.dialog-cancel').addEventListener('click', closeMatterDialog);
matterDialog.addEventListener('click', (event) => {
  if (event.target === matterDialog) closeMatterDialog();
});

matterForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(matterForm);
  const nextId = 1049 + addedMatters.length;
  const newMatter = {
    id: `M-${nextId}`,
    name: String(formData.get('matterName')).trim(),
    client: String(formData.get('client')).trim(),
    type: String(formData.get('type')),
    lead: String(formData.get('lead')),
    date: String(formData.get('date')),
    status: 'Active',
  };
  if (!newMatter.name || !newMatter.client || !newMatter.type) return;

  addedMatters.unshift(newMatter);
  matters.unshift(newMatter);
  try {
    localStorage.setItem('morrow-added-matters', JSON.stringify(addedMatters));
  } catch {
    showToast('Matter added for this session');
  }
  closeMatterDialog();
  document.querySelector('#matter-status-filter').value = 'all';
  renderMatters();
  setView('matters');
  showToast('Matter created successfully');
});

document.querySelector('#task-list').addEventListener('change', (event) => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  event.target.closest('.task-item').classList.toggle('is-done', event.target.checked);
  const remaining = document.querySelectorAll('#task-list input:not(:checked)').length;
  document.querySelector('#task-summary').textContent = `${remaining} remaining`;
});

document.querySelector('.invoice-table').addEventListener('click', (event) => {
  const button = event.target.closest('.mark-paid');
  if (!button) return;
  const row = button.closest('.invoice-row');
  row.dataset.paid = 'true';
  const status = row.querySelector('.status');
  status.className = 'status status-paid';
  status.textContent = 'Paid';
  const received = document.createElement('span');
  received.className = 'paid-label';
  received.textContent = 'Received';
  button.replaceWith(received);
  updateOutstanding();
  showToast('Invoice marked as paid');
});

document.querySelector('#billing-export').addEventListener('click', () => {
  const rows = [...document.querySelectorAll('.invoice-row')].map((row) => [...row.cells].slice(0, 6).map((cell) => `"${cell.textContent.trim().replaceAll('"', '""')}"`).join(','));
  const csv = ['Invoice,Client,Issued,Due date,Amount,Status', ...rows].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'morrow-finch-invoices.csv';
  link.click();
  URL.revokeObjectURL(url);
  document.querySelector('#export-note').textContent = 'Report downloaded as CSV.';
  showToast('Billing report exported');
});

document.querySelector('.notification-button').addEventListener('click', () => showToast('You’re all caught up'));
document.querySelector('.profile-button').addEventListener('click', () => showToast('Account settings are available to the firm administrator'));
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    globalSearch.focus();
  }
});

const today = new Date();
document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(today).toUpperCase();
const initialView = window.location.hash.slice(1);
if (['overview', 'matters', 'clients', 'calendar', 'billing'].includes(initialView)) setView(initialView);
renderMatters();
updateOutstanding();
document.querySelector('#task-summary').textContent = `${document.querySelectorAll('#task-list input:not(:checked)').length} remaining`;