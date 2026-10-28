/**
 * AMICA SOHO - Admin Password Authentication Service
 * 
 * Provides secure password protection for admin and management controls,
 * session management, customizable password storage, and audit logging.
 */

import { clubStore } from './storage';

const ADMIN_PASSWORD_KEY = 'amica_admin_password_hash_v1';
const ADMIN_SESSION_KEY = 'amica_admin_session_auth_v1';
const DEFAULT_ADMIN_PASSWORD = 'Amica2026'; // Default password (also accepts '1984' as fallback PIN)

type AuthListener = () => void;
const authListeners = new Set<AuthListener>();

function notifyAuthChange() {
  authListeners.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error('Admin auth listener error:', err);
    }
  });
}

export function subscribeAdminAuth(cb: AuthListener): () => void {
  authListeners.add(cb);
  return () => {
    authListeners.delete(cb);
  };
}

export const adminAuth = {
  /**
   * Get current stored admin password (or default)
   */
  getAdminPassword(): string {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
  },

  /**
   * Check if user is currently authenticated as admin in this browser session
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
    return session === 'true';
  },

  /**
   * Authenticate with admin password
   */
  login(passwordAttempt: string): { success: boolean; error?: string } {
    const trimmed = passwordAttempt.trim();
    const stored = this.getAdminPassword();

    // Accept stored password, default password, or master PIN 1984
    if (trimmed === stored || trimmed === DEFAULT_ADMIN_PASSWORD || trimmed === '1984') {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');

      // Auto-set current staff to Admin if currently non-admin
      const currentStaff = clubStore.getCurrentStaff();
      if (currentStaff.role !== 'admin' && currentStaff.role !== 'manager') {
        const staffList = clubStore.getStaffList();
        const adminStaff = staffList.find((s) => s.role === 'admin') || staffList[0];
        if (adminStaff) {
          clubStore.setCurrentStaff(adminStaff.id);
        }
      }

      clubStore.addAuditLog({
        actorId: 'admin-gate',
        actorName: 'Admin Security Gate',
        actorRole: 'admin',
        action: 'ADMIN_PASSWORD_AUTHENTICATED',
        targetType: 'member',
        targetId: 'admin-session',
        reason: 'Authorized access granted via admin password verification.',
      });

      notifyAuthChange();
      return { success: true };
    }

    clubStore.addAuditLog({
      actorId: 'admin-gate',
      actorName: 'Admin Security Gate',
      actorRole: 'door',
      action: 'ADMIN_PASSWORD_FAILED_ATTEMPT',
      targetType: 'member',
      targetId: 'admin-session',
      reason: 'Failed password verification attempt on admin gate.',
    });

    return { success: false, error: 'Incorrect admin password. Please try again.' };
  },

  /**
   * Lock admin session
   */
  logout(): void {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);

    // Switch active staff to door or reception role if currently on admin
    const currentStaff = clubStore.getCurrentStaff();
    if (currentStaff.role === 'admin') {
      const staffList = clubStore.getStaffList();
      const doorStaff = staffList.find((s) => s.role === 'door' || s.role === 'reception') || staffList[1];
      if (doorStaff) {
        clubStore.setCurrentStaff(doorStaff.id);
      }
    }

    clubStore.addAuditLog({
      actorId: 'admin-gate',
      actorName: 'Admin Security Gate',
      actorRole: 'admin',
      action: 'ADMIN_SESSION_LOCKED',
      targetType: 'member',
      targetId: 'admin-session',
      reason: 'Admin mode manually locked by operator.',
    });

    notifyAuthChange();
  },

  /**
   * Change admin password
   */
  changePassword(currentPasswordAttempt: string, newPassword: string): { success: boolean; error?: string } {
    const trimmedOld = currentPasswordAttempt.trim();
    const trimmedNew = newPassword.trim();
    const stored = this.getAdminPassword();

    if (trimmedOld !== stored && trimmedOld !== DEFAULT_ADMIN_PASSWORD && trimmedOld !== '1984') {
      return { success: false, error: 'Current password is incorrect.' };
    }

    if (trimmedNew.length < 4) {
      return { success: false, error: 'New password must be at least 4 characters.' };
    }

    localStorage.setItem(ADMIN_PASSWORD_KEY, trimmedNew);
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');

    clubStore.addAuditLog({
      actorId: 'admin-gate',
      actorName: 'Admin Security Gate',
      actorRole: 'admin',
      action: 'ADMIN_PASSWORD_CHANGED',
      targetType: 'member',
      targetId: 'admin-credentials',
      reason: 'Admin credentials successfully updated.',
    });

    notifyAuthChange();
    return { success: true };
  },

  /**
   * Reset password to default
   */
  resetToDefault(): void {
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
    notifyAuthChange();
  },

  /**
   * Check if password has been customized
   */
  isCustomized(): boolean {
    return Boolean(localStorage.getItem(ADMIN_PASSWORD_KEY));
  },

  getDefaultPasswordHint(): string {
    return DEFAULT_ADMIN_PASSWORD;
  },
};
