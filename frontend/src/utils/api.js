const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  const user = JSON.parse(localStorage.getItem('ems_auth_user') || '{}');
  return user.token;
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log('API Request:', `${API_BASE_URL}${endpoint}`, config);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    console.log('API Response:', response.status, data);

    if (!response.ok) {
      throw new Error(data.message || `API request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  register: (userData) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  login: (credentials) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () => apiCall('/auth/me'),

  updateProfile: (profileData) =>
    apiCall('/auth/updateprofile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  updatePassword: (passwordData) =>
    apiCall('/auth/updatepassword', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    }),
};

// Events API
export const eventsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/events${queryString ? `?${queryString}` : ''}`);
  },

  // Alias for getAll
  getAllEvents: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/events${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => apiCall(`/events/${id}`),

  // Alias for getById
  getEventById: (id) => apiCall(`/events/${id}`),

  create: (eventData) =>
    apiCall('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    }),

  // Alias for create
  createEvent: (eventData) =>
    apiCall('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    }),

  update: (id, eventData) =>
    apiCall(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    }),

  // Alias for update
  updateEvent: (id, eventData) =>
    apiCall(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    }),

  delete: (id) =>
    apiCall(`/events/${id}`, {
      method: 'DELETE',
    }),

  // Alias for delete
  deleteEvent: (id) =>
    apiCall(`/events/${id}`, {
      method: 'DELETE',
    }),

  getMyEvents: () => apiCall('/events/organizer/my-events'),

  getStats: (id) => apiCall(`/events/${id}/stats`),

  approve: (id, status, rejectionReason) =>
    apiCall(`/events/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ status, rejectionReason }),
    }),
};

// Registrations API
export const registrationsAPI = {
  register: (registrationData) =>
    apiCall('/registrations', {
      method: 'POST',
      body: JSON.stringify(registrationData),
    }),

  // Alias for register - accepts eventId and optional formData
  registerForEvent: (eventId, formData = {}) =>
    apiCall('/registrations', {
      method: 'POST',
      body: JSON.stringify({ eventId, ...formData }),
    }),

  getMyRegistrations: () => apiCall('/registrations/my-registrations'),

  // Alias for getMyRegistrations
  getUserRegistrations: () => apiCall('/registrations/my-registrations'),

  getById: (id) => apiCall(`/registrations/${id}`),

  getEventRegistrations: (eventId) => apiCall(`/registrations/event/${eventId}`),

  updateRegistrationStatus: (id, status) =>
    apiCall(`/registrations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  cancel: (id) =>
    apiCall(`/registrations/${id}/cancel`, {
      method: 'PUT',
    }),

  // Alias for cancel
  cancelRegistration: (id) =>
    apiCall(`/registrations/${id}/cancel`, {
      method: 'PUT',
    }),

  updatePayment: (id, paymentData) =>
    apiCall(`/registrations/${id}/payment`, {
      method: 'PUT',
      body: JSON.stringify(paymentData),
    }),

  checkIn: (id) =>
    apiCall(`/registrations/${id}/checkin`, {
      method: 'PUT',
    }),

  getOrganizerRegistrations: () => apiCall('/registrations/organizer/my-registrations'),

  getStats: () => apiCall('/registrations/stats/overview'),
};

// Clubs API
export const clubsAPI = {
  getAll: () => apiCall('/clubs'),

  getById: (id) => apiCall(`/clubs/${id}`),

  create: (clubData) =>
    apiCall('/clubs', {
      method: 'POST',
      body: JSON.stringify(clubData),
    }),

  update: (id, clubData) =>
    apiCall(`/clubs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clubData),
    }),

  delete: (id) =>
    apiCall(`/clubs/${id}`, {
      method: 'DELETE',
    }),

  addMember: (id, userId) =>
    apiCall(`/clubs/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  removeMember: (id, userId) =>
    apiCall(`/clubs/${id}/members/${userId}`, {
      method: 'DELETE',
    }),

  getStats: (id) => apiCall(`/clubs/${id}/stats`),
};

// Admin API
export const adminAPI = {
  getAllUsers: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/admin/users${queryString ? `?${queryString}` : ''}`);
  },

  getUser: (id) => apiCall(`/admin/users/${id}`),

  updateUser: (id, userData) =>
    apiCall(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  deleteUser: (id) =>
    apiCall(`/admin/users/${id}`, {
      method: 'DELETE',
    }),

  promoteUser: (id) =>
    apiCall(`/admin/users/${id}/promote`, {
      method: 'PUT',
    }),

  getStats: () => apiCall('/admin/stats'),

  getPendingEvents: () => apiCall('/admin/pending-events'),

  createOrganizer: (organizerData) =>
    apiCall('/admin/organizers', {
      method: 'POST',
      body: JSON.stringify(organizerData),
    }),
};

// Discussions API
export const discussionsAPI = {
  create: (discussionData) =>
    apiCall('/discussions', {
      method: 'POST',
      body: JSON.stringify(discussionData),
    }),

  // Alias for create - accepts eventId and thread data
  createThread: (eventId, threadData) =>
    apiCall('/discussions', {
      method: 'POST',
      body: JSON.stringify({ eventId, ...threadData }),
    }),

  getEventDiscussions: (eventId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/discussions/event/${eventId}${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => apiCall(`/discussions/${id}`),

  reply: (id, content) =>
    apiCall(`/discussions/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  update: (id, updateData) =>
    apiCall(`/discussions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }),

  delete: (id) =>
    apiCall(`/discussions/${id}`, {
      method: 'DELETE',
    }),

  togglePin: (id) =>
    apiCall(`/discussions/${id}/pin`, {
      method: 'PUT',
    }),
};

// Feedback API
export const feedbackAPI = {
  submit: (feedbackData) =>
    apiCall('/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    }),

  getEventFeedback: (eventId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/feedback/event/${eventId}${queryString ? `?${queryString}` : ''}`);
  },

  getMyFeedback: () => apiCall('/feedback/my-feedback'),

  getById: (id) => apiCall(`/feedback/${id}`),

  update: (id, feedbackData) =>
    apiCall(`/feedback/${id}`, {
      method: 'PUT',
      body: JSON.stringify(feedbackData),
    }),

  delete: (id) =>
    apiCall(`/feedback/${id}`, {
      method: 'DELETE',
    }),

  markHelpful: (id) =>
    apiCall(`/feedback/${id}/helpful`, {
      method: 'PUT',
    }),
};

export default {
  auth: authAPI,
  events: eventsAPI,
  registrations: registrationsAPI,
  clubs: clubsAPI,
  admin: adminAPI,
  discussions: discussionsAPI,
  feedback: feedbackAPI,
};
