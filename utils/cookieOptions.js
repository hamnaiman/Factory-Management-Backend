// utils/cookieOptions.js

/**
 * Centralized cookie options.
 *
 * IMPORTANT: `path` MUST be explicitly set to "/" here and used
 * consistently in every res.cookie() / res.clearCookie() call.
 * If you omit `path`, the browser defaults it to the directory of
 * the request URL that set the cookie (e.g. "/api/auth" for a
 * login route), NOT "/". That causes the cookie to be invisible to
 * other routes, and causes duplicate stale "token" cookies to pile
 * up with different paths — which is exactly what was causing the
 * "old token" / random 401 Unauthorized issue.
 */

const isProduction = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,     // true in prod (HTTPS), false in local http dev
  sameSite: isProduction ? "none" : "lax", // "none" only works with secure:true (HTTPS)
  path: "/",                 // <-- THE FIX: must be identical everywhere
};

const loginCookieOptions = {
  ...baseCookieOptions,
  maxAge: 24 * 60 * 60 * 1000, // 24h — should match JWT expiresIn
};

const clearCookieOptions = {
  ...baseCookieOptions,
  // maxAge/expires not needed for clearCookie
};

module.exports = {
  loginCookieOptions,
  clearCookieOptions,
};