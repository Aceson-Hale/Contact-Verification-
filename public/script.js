function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderDl(pairs) {
  const rows = pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('');
  return `<dl>${rows}</dl>`;
}

function setLoading(out, btn, input, isLoading) {
  btn.disabled = isLoading;
  input.disabled = isLoading;
  if (isLoading) {
    out.innerHTML = '<span class="loading"><span class="spinner"></span>Checking...</span>';
  }
}

// A bare 10-digit number is assumed to be a US number. Anything that already
// carries a country code (a leading "+", or 11 digits starting with "1") is
// left as-is so other countries can be searched too.
function normalizePhone(raw) {
  const cleaned = raw.trim().replace(/[\s\-().]/g, '');
  if (!cleaned) return { ok: false };

  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1);
    if (!/^\d{7,15}$/.test(digits)) return { ok: false };
    return { ok: true, value: `+${digits}` };
  }

  if (!/^\d+$/.test(cleaned)) return { ok: false };

  if (cleaned.length === 10) {
    return { ok: true, value: `+1${cleaned}` };
  }

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return { ok: true, value: `+${cleaned}` };
  }

  return { ok: false };
}

function isValidEmailFormat(raw) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

async function verifyPhone() {
  const input = document.getElementById('phone');
  const btn = document.getElementById('phone-btn');
  const out = document.getElementById('phone-result');
  const raw = input.value.trim();

  if (!raw) {
    out.innerHTML = '<span class="error">Enter a phone number first.</span>';
    return;
  }

  const normalized = normalizePhone(raw);
  if (!normalized.ok) {
    out.innerHTML = '<span class="error">That doesn\'t look like a valid phone number. '
      + 'Enter a 10-digit US number, or include a country code (e.g. +44 20 7946 0958).</span>';
    return;
  }

  setLoading(out, btn, input, true);

  try {
    const res = await fetch(`/api/verify-phone?number=${encodeURIComponent(normalized.value)}`);
    const data = await res.json();

    if (!res.ok) {
      out.innerHTML = `<span class="error">${escapeHtml(data.error || 'Verification failed.')}</span>`;
      return;
    }

    if (!data.valid) {
      out.innerHTML = '<span class="badge warn">Not confirmed</span>'
        + `<p class="warn-text">${escapeHtml(normalized.value)} is correctly formatted, `
        + 'but we couldn\'t confirm it\'s a real, in-service number.</p>';
      return;
    }

    out.innerHTML = '<span class="badge valid">Valid</span>' + renderDl([
      ['Number', data.international_format],
      ['Country', data.country_name],
      ['Carrier', data.carrier],
      ['Line type', data.line_type],
      ['Location', data.location],
    ]);
  } catch (err) {
    out.innerHTML = '<span class="error">Network error. Is the server running?</span>';
  } finally {
    setLoading(out, btn, input, false);
  }
}

async function verifyEmail() {
  const input = document.getElementById('email');
  const btn = document.getElementById('email-btn');
  const out = document.getElementById('email-result');
  const email = input.value.trim();

  if (!email) {
    out.innerHTML = '<span class="error">Enter an email address first.</span>';
    return;
  }

  if (!isValidEmailFormat(email)) {
    out.innerHTML = '<span class="error">That doesn\'t look like a valid email address '
      + '(expected something like name@example.com).</span>';
    return;
  }

  setLoading(out, btn, input, true);

  try {
    const res = await fetch(`/api/verify-email?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!res.ok) {
      out.innerHTML = `<span class="error">${escapeHtml(data.error || 'Verification failed.')}</span>`;
      return;
    }

    if (!data.format_valid) {
      out.innerHTML = '<span class="error">That doesn\'t look like a valid email address '
        + '(expected something like name@example.com).</span>';
      return;
    }

    if (!data.mx_found || !data.smtp_check) {
      out.innerHTML = '<span class="badge warn">Not confirmed</span>'
        + '<p class="warn-text">This address is formatted correctly, but we couldn\'t confirm it actually exists.</p>';
      return;
    }

    out.innerHTML = '<span class="badge valid">Deliverable</span>' + renderDl([
      ['Format valid', data.format_valid],
      ['MX found', data.mx_found],
      ['SMTP check', data.smtp_check],
      ['Catch-all', data.catch_all],
      ['Disposable', data.disposable],
      ['Free provider', data.free],
      ['Role account', data.role],
      ['Score', data.score],
    ]);
  } catch (err) {
    out.innerHTML = '<span class="error">Network error. Is the server running?</span>';
  } finally {
    setLoading(out, btn, input, false);
  }
}

document.getElementById('phone-btn').addEventListener('click', verifyPhone);
document.getElementById('email-btn').addEventListener('click', verifyEmail);
document.getElementById('phone').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifyPhone();
});
document.getElementById('email').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifyEmail();
});
