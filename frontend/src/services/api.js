// Single API client. Handles JSON, CSRF token, and consistent error objects.
//
// Session: the server sets an httpOnly cookie (primary channel). The token is
// also kept in localStorage as a fallback channel (Authorization: Bearer) for
// environments where third-party cookies are blocked (e.g. cross-site iframes).
// Either channel authenticates; logout clears both.

const SESSION_KEY = 'spb_session';
const API_BASE = import.meta.env.VITE_API_URL || '';

export function getSessionToken() {
  try { return localStorage.getItem(SESSION_KEY) || null; } catch { return null; }
}

export function setSessionToken(token) {
  try {
    token
      ? localStorage.setItem(SESSION_KEY, token)
      : localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function clearSessionToken() {
  setSessionToken(null);
}

let csrfToken = null;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function authHeaders() {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function raw(path, options = {}) {
  // Note: Content-Type is only set when there is a body. Some intermediary
  // proxies/WAFs reject GET requests carrying a JSON content type.
  const headers = { ...authHeaders(), ...(options.headers || {}) };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: 'include',
    method: options.method || 'GET',
    headers,
    body: options.body,
  });

  if (res.status === 204) return null;

  let data = null;

  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    throw new ApiError(
      data?.error || `Request failed (${res.status})`,
      res.status
    );
  }

  return data;
}

async function getCsrf(force = false) {
  if (csrfToken && !force) return csrfToken;

  const data = await raw('/csrf');
  csrfToken = data.token;

  return csrfToken;
}

async function request(method, path, body) {
  const send = async (withCsrf) => {
    const options = {
      method,
      headers: { ...authHeaders() }
    };

    if (method !== 'GET' && method !== 'HEAD') {
      if (withCsrf) {
        // Cookie channel: double-submit CSRF token.
        // Bearer channel skips CSRF server-side.
        options.headers['X-CSRF-Token'] = await getCsrf();
      }

      if (body !== undefined) {
        options.body = JSON.stringify(body);
      }
    }

    return raw(path, options);
  };

  try {
    return await send(!getSessionToken());
  } catch (err) {
    // Stale CSRF token (cookie expired or dropped while the tab stayed open):
    // re-fetch a fresh token and retry the mutation exactly once.
    if (
      err instanceof ApiError &&
      err.status === 403 &&
      /csrf|token/i.test(err.message)
    ) {
      csrfToken = null;

      try {
        return await send(true);
      } catch {
        throw err;
      }
    }

    throw err;
  }
}

export default {
  get: (path) => request('GET', path),

  post: (path, body) => request('POST', path, body),

  put: (path, body) => request('PUT', path, body),

  del: (path) => request('DELETE', path),

  // Multipart upload (avatar / cover / logo)
  async upload(path, file, field = 'file') {
    const headers = { ...authHeaders() };

    if (!getSessionToken()) {
      headers['X-CSRF-Token'] = await getCsrf();
    }

    const form = new FormData();
    form.append(field, file);

    const res = await fetch(`${API_BASE}/api${path}`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: form,
    });

    let data = null;

    try {
      data = await res.json();
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      throw new ApiError(
        data?.error || 'Upload failed',
        res.status
      );
    }

    return data;
  },
};
