// utils/cookieOptions.js

/**
 * Centralized authentication cookie configuration.
 *
 * Production:
 * - Frontend: Vercel / HTTPS
 * - Backend: Render / HTTPS
 * - Cross-site cookie: SameSite=None
 * - Secure cookie: true
 *
 * Development:
 * - Same-site/local HTTP development
 * - SameSite=Lax
 * - Secure=false
 *
 * IMPORTANT:
 * Always keep path: "/" so the authentication cookie
 * is available to every API route.
 */

const isProduction = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true,

  // Render production runs over HTTPS.
  secure: isProduction,

  // Required for Vercel -> Render cross-site cookie usage.
  sameSite: isProduction ? "none" : "lax",

  // Authentication cookie must be available to all API routes.
  path: "/",
};

const loginCookieOptions = {
  ...baseCookieOptions,

  // Keep this synchronized with JWT expiration.
  maxAge: 24 * 60 * 60 * 1000,
};

const clearCookieOptions = {
  ...baseCookieOptions,

  // Explicitly remove any existing cookie.
  maxAge: 0,
};

module.exports = {
  loginCookieOptions,
  clearCookieOptions,
};