// User Roles
export const USER_ROLES = {
  PARTICIPANT: 'Participant',
  ORGANIZER: 'Organizer',
  ADMIN: 'Admin',
};

// Participant Types
export const PARTICIPANT_TYPES = {
  IIIT: 'IIIT',
  NON_IIIT: 'Non-IIIT',
};

// Event Types
export const EVENT_TYPES = {
  NORMAL: 'Normal',
  MERCHANDISE: 'Merchandise',
};

// Event Status
export const EVENT_STATUS = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
};

// Registration Status
export const REGISTRATION_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
};

// Payment Status (for Merchandise)
export const PAYMENT_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// Event Categories
export const EVENT_CATEGORIES = [
  'Technology',
  'Entertainment',
  'Food & Drink',
  'Sports',
  'Education',
  'Business',
  'Arts & Culture',
  'Gaming',
  'Workshop',
  'Competition',
];

// Organizer Categories
export const ORGANIZER_CATEGORIES = [
  'Technical Club',
  'Cultural Club',
  'Sports Club',
  'Literary Club',
  'Council',
  'Fest Team',
  'Other',
];

// Areas of Interest
export const AREAS_OF_INTEREST = [
  'Web Development',
  'Mobile Development',
  'Machine Learning',
  'Data Science',
  'Cybersecurity',
  'Cloud Computing',
  'Design',
  'Music',
  'Dance',
  'Drama',
  'Photography',
  'Sports',
  'Literature',
  'Debate',
  'Gaming',
];

// Eligibility Types
export const ELIGIBILITY_TYPES = {
  ALL: 'All',
  IIIT_ONLY: 'IIIT Only',
  EXTERNAL_ONLY: 'External Only',
};

// Form Field Types for Dynamic Forms
export const FORM_FIELD_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  NUMBER: 'number',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  FILE: 'file',
  DATE: 'date',
  TIME: 'time',
};

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  EMAIL_IIIT_DOMAIN: '@iiit.ac.in',
  EVENT_TITLE_MIN_LENGTH: 3,
  EVENT_DESCRIPTION_MIN_LENGTH: 20,
  EVENT_LOCATION_MIN_LENGTH: 5,
  MAX_EVENT_CAPACITY: 10000,
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_USER: 'ems_auth_user',
  EVENTS: 'ems_events',
  REGISTRATIONS: 'ems_registrations',
  USERS: 'ems_users',
};

// Route Paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  
  // Participant Routes
  DASHBOARD: '/dashboard',
  BROWSE_EVENTS: '/events',
  EVENT_DETAILS: '/event/:id',
  CLUBS: '/clubs',
  CLUB_DETAILS: '/club/:id',
  PROFILE: '/profile',
  
  // Organizer Routes
  ORGANIZER_DASHBOARD: '/organizer/dashboard',
  CREATE_EVENT: '/organizer/create-event',
  EDIT_EVENT: '/organizer/edit-event/:id',
  ORGANIZER_EVENT_DETAILS: '/organizer/event/:id',
  ORGANIZER_PROFILE: '/organizer/profile',
  ONGOING_EVENTS: '/organizer/ongoing',
  
  // Admin Routes
  ADMIN_DASHBOARD: '/admin/dashboard',
  MANAGE_CLUBS: '/admin/clubs',
  PASSWORD_RESET_REQUESTS: '/admin/password-resets',
};

// API Endpoints (for future backend integration)
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  
  // Events
  GET_EVENTS: '/api/events',
  CREATE_EVENT: '/api/events',
  UPDATE_EVENT: '/api/events/:id',
  DELETE_EVENT: '/api/events/:id',
  
  // Registrations
  REGISTER_EVENT: '/api/registrations',
  GET_MY_REGISTRATIONS: '/api/registrations/me',
  
  // Profile
  GET_PROFILE: '/api/profile',
  UPDATE_PROFILE: '/api/profile',
};
