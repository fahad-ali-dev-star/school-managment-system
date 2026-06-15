
export type PlanType = 'free' | 'basic' | 'pro';

export interface PlanFeatures {
  maxStudents: number;
  hasCoreOps: boolean;
  hasAttendance: boolean;
  hasFees: boolean;
  hasExams: boolean;
  hasLeaves: boolean;
  hasAlerts: boolean;
  hasAnalytics: boolean;
  hasParentPortal: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanFeatures> = {
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
  basic: {
    maxStudents: 200,
    hasCoreOps: true,
    hasAttendance: true,
    hasFees: true,
    hasExams: false,
    hasLeaves: false,
    hasAlerts: false,
    hasAnalytics: false,
    hasParentPortal: false
  },
  pro: {
    maxStudents: 999999,
    hasCoreOps: true,
    hasAttendance: true,
    hasFees: true,
    hasExams: true,
    hasLeaves: true,
    hasAlerts: true,
    hasAnalytics: true,
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
