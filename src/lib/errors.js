export const INSUFFICIENT_ROLE_MESSAGE = 'You do not have permission to make this change.';

export function getErrorBody(error) {
  return error?.response?.data || null;
}

export function isFeatureLockedError(error) {
  const e = error?.response?.data?.errors;
  return error?.response?.status === 403 && Array.isArray(e) && e.some((x) => x?.code === 'FEATURE_NOT_ENABLED');
}

export function isPasswordChangeRequired(error) {
  const e = error?.response?.data?.errors;
  return error?.response?.status === 403 && Array.isArray(e) && e.some((x) => x?.code === 'PASSWORD_CHANGE_REQUIRED');
}

export function lockedFeatureCode(error) {
  return error?.response?.data?.errors?.find((x) => x?.code === 'FEATURE_NOT_ENABLED')?.feature || null;
}

/** Human readable message for any axios error. */
export function errorMessage(error) {
  if (!error) return '';
  const data = error.response?.data;
  if (error.response?.status === 403 && data?.message === 'Insufficient role') return INSUFFICIENT_ROLE_MESSAGE;
  if (data?.errors?.length) {
    return data.errors
      .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
      .filter(Boolean)
      .join(', ') || data.message || 'Request failed';
  }
  return data?.message || error.message || 'Something went wrong';
}

/** 422 validation errors as { field: message } for inline form display. */
export function fieldErrors(error) {
  const out = {};
  if (error?.response?.status !== 422) return out;
  (error.response.data?.errors || []).forEach((e) => {
    if (e.field && !out[e.field]) out[e.field] = e.message;
  });
  return out;
}
