const express = require('express');
const {
  registerForEvent,
  getMyRegistrations,
  getRegistration,
  getEventRegistrations,
  cancelRegistration,
  updateRegistrationStatus,
  updatePaymentStatus,
  checkInParticipant,
  getRegistrationStats,
  getOrganizerRegistrations
} = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Participant routes
router.post('/', protect, authorize('Participant', 'Organizer', 'Admin'), registerForEvent);
router.get('/my-registrations', protect, authorize('Participant', 'Organizer', 'Admin'), getMyRegistrations);
router.put('/:id/cancel', protect, authorize('Participant', 'Organizer', 'Admin'), cancelRegistration);
// Organizer routes (more specific paths must be registered before :id)
router.get('/event/:eventId', protect, authorize('Organizer', 'Admin'), getEventRegistrations);
router.put('/:id/payment', protect, authorize('Organizer', 'Admin'), updatePaymentStatus);
router.put('/:id/checkin', protect, authorize('Organizer', 'Admin'), checkInParticipant);
router.put('/:id/status', protect, authorize('Organizer', 'Admin'), updateRegistrationStatus);
router.get('/organizer/my-registrations', protect, authorize('Organizer', 'Admin'), getOrganizerRegistrations);

// Admin routes
router.get('/stats/overview', protect, authorize('Admin'), getRegistrationStats);

// Get single registration (owner or organizer/admin)
router.get('/:id', protect, getRegistration);

module.exports = router;
