// Small shared helpers used across screens.

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ageLabel(birthDate, estimated) {
  if (!birthDate) return 'Unknown age';
  const birth = new Date(birthDate + 'T00:00:00');
  if (isNaN(birth)) return 'Unknown age';
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) months = 0;
  let label;
  if (months < 1) label = 'Newborn';
  else if (months < 24) label = `${months} mo`;
  else label = `${Math.floor(months / 12)} yr`;
  return estimated ? `${label} (est.)` : label;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function qs(id) {
  return document.getElementById(id);
}

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  });
  (children || []).forEach(c => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}

function toast(message) {
  let box = qs('toast');
  if (!box) {
    box = el('div', { id: 'toast', class: 'toast' }, []);
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => box.classList.remove('show'), 2200);
}

function confirmAction(message) {
  return window.confirm(message);
}
