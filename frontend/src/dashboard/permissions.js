// What each role may do in the dashboard. These mirror the Django API
// permissions; the API enforces them, the UI just hides what is not allowed.
const RULES = {
  'property.delete': ['admin', 'dealer'],
  'location.manage': ['admin', 'dealer'],
  'settings.manage': ['admin'],
  'lead.delete': ['admin'],
  'customer.delete': ['admin'],
  'visit.delete': ['admin', 'dealer'],
};

export const can = (user, action) => Boolean(user?.is_management) && (!RULES[action] || RULES[action].includes(user.role));

export class NotStaffError extends Error {}
