
export type PlanType = 'free' | 'basic' | 'pro';

export interface PlanFeatures {
  maxStudents: number;
  hasCoreOps: boolean;
  hasAttendance: boolean;
  hasFees: boolean;
  hasExams: boolean;
  hasLeaves: boolean;
  hasAlerts: boolean;
  hasAnalytics: boolean; // AI Chatbot — Pro only
  hasParentPortal: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanFeatures> = {
  // Free plan: core ops only — same as what "Basic" used to be
  free: {
    maxStudents: 50,
    hasCoreOps: true,
    hasAttendance: true,
    hasFees: true,
    hasExams: false,
    hasLeaves: false,
    hasAlerts: false,
    hasAnalytics: false,
    hasParentPortal: false
  },

  // Basic plan: now has what "Pro" used to offer, EXCEPT AI Chatbot (hasAnalytics)
  basic: {
    maxStudents: 200,
    hasCoreOps: true,
    hasAttendance: true,
    hasFees: true,
    hasExams: true,
    hasLeaves: true,
    hasAlerts: true,
    hasAnalytics: false, // AI Chatbot NOT included in Basic
    hasParentPortal: true
  },

  // Pro plan: everything including AI Chatbot
  pro: {
    maxStudents: 999999,
    hasCoreOps: true,
    hasAttendance: true,
    hasFees: true,
    hasExams: true,
    hasLeaves: true,
    hasAlerts: true,
    hasAnalytics: true, // AI Chatbot — Pro exclusive
    hasParentPortal: true
  }
};

export function canAccess(currentPlan: string, feature: keyof PlanFeatures): boolean {
  const limits = PLAN_LIMITS[currentPlan.toLowerCase() as PlanType];
  if (!limits) return false;
  
  const value = limits[feature];
  if (typeof value === 'boolean') return value;
  return true;
}
