// Feature codes. Never hardcode these strings inside components.
export const FEATURE = {
  // Core (always on)
  PROPERTY_SETUP: 'PROPERTY_SETUP',
  RESIDENTS: 'RESIDENTS',
  RENT_PAYMENTS: 'RENT_PAYMENTS',
  DASHBOARD: 'DASHBOARD',
  NOTIFICATIONS: 'NOTIFICATIONS',
  ROLES_ACCESS: 'ROLES_ACCESS',
  // Add-ons
  STAFF: 'STAFF',
  INVENTORY: 'INVENTORY',
  MAINTENANCE: 'MAINTENANCE',
  COMPLAINTS: 'COMPLAINTS',
  VISITORS: 'VISITORS',
  FOOD_MENU: 'FOOD_MENU',
  FINANCE: 'FINANCE',
  DISCOUNTS: 'DISCOUNTS',
  ONLINE_PAYMENTS: 'ONLINE_PAYMENTS',
  PROMOTIONS: 'PROMOTIONS',
  DOCUMENTS: 'DOCUMENTS',
  REPORTS: 'REPORTS',
  RESIDENT_APP: 'RESIDENT_APP',
};

export const CORE_FEATURES = [
  FEATURE.PROPERTY_SETUP, FEATURE.RESIDENTS, FEATURE.RENT_PAYMENTS,
  FEATURE.DASHBOARD, FEATURE.NOTIFICATIONS, FEATURE.ROLES_ACCESS,
];

export const isCoreFeature = (code) => CORE_FEATURES.includes(code);

/** Permission required for the tenant Roles page. */
export const ROLES_PERMISSION = 'roles:manage';

export const PRICE_TYPES = { PER_BED: 'PER_BED', FLAT: 'FLAT' };

export const PRICE_TYPE_LABEL = { PER_BED: 'Per bed / month', FLAT: 'Flat / month' };

const inr = (n, digits = 2) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: digits, maximumFractionDigits: digits })
    .format(Number.isFinite(Number(n)) ? Number(n) : 0);

/** Money formatted as INR with 2 decimals. Safe for Decimal strings, null and NaN. */
export const formatINR = (n) => inr(n, 2);

/** "₹20.00 per bed / month" or "₹500.00 / month". */
export function formatFeaturePrice(price, priceType) {
  return priceType === PRICE_TYPES.FLAT ? `${formatINR(price)} / month` : `${formatINR(price)} per bed / month`;
}

/** Monthly cost of one add-on for a given bed count. */
export function monthlyCostFor(price, priceType, beds) {
  const p = Number(price) || 0;
  return priceType === PRICE_TYPES.FLAT ? p : p * (Number(beds) || 0);
}
