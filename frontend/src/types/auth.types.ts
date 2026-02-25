/**
 * Core User entity matching the FastAPI database schema
 */
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Expected payload from the /api/v1/auth/login endpoint
 */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

/**
 * Standardized error format matching FastAPI's HTTPException
 */
export interface AuthError {
  detail: string;
}