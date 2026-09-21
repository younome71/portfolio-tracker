import { jwtDecode } from 'jwt-decode';

export const setAuthToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const decodeToken = (token) => {
  try {
    return jwtDecode(token);
  } catch (err) {
    return null;
  }
};

export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return Date.now() >= decoded.exp * 1000;
};

export const normalizeUserFromToken = (token) => {
  const decoded = decodeToken(token);
  if (!decoded) return null;

  // Support both nested { user: {...} } and flat payloads
  const nested = decoded.user || {};
  return {
    id: nested.id || decoded.id || null,
    role: nested.role || decoded.role || 'parent',
    name: nested.name || decoded.name || '',
    email: nested.email || decoded.email || '',
  };
};
