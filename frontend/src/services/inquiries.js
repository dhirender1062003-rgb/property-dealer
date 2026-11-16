import api from './api';

export class ServiceUnavailableError extends Error {}
export class RateLimitError extends Error {}

export class ValidationError extends Error {
  constructor(fieldErrors) {
    super(fieldErrors.non_field_errors || 'Please correct the highlighted fields.');
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Send an enquiry to Django: POST /api/inquiries/
 * Resolves only when Django confirms the enquiry was saved (HTTP 201).
 * Throws ValidationError (400), RateLimitError (429) or
 * ServiceUnavailableError (server down / endpoint missing / server error).
 */
export async function submitInquiry(payload) {
  try {
    const { data } = await api.post('/inquiries/', payload);
    return data;
  } catch (error) {
    const status = error.response?.status;
    if (status === 400 && error.response.data && typeof error.response.data === 'object') {
      const fieldErrors = Object.fromEntries(
        Object.entries(error.response.data).map(([key, value]) => [key, [].concat(value).join(' ')]),
      );
      throw new ValidationError(fieldErrors);
    }
    if (status === 429) {
      throw new RateLimitError('Too many enquiries were sent from this connection. Please try again later.');
    }
    if (!error.response || status === 404 || status === 405 || status >= 500) {
      throw new ServiceUnavailableError('The enquiry service is not available right now.');
    }
    throw error;
  }
}
