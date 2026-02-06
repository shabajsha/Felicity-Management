const express = require('express');
const {
  registerForEvent,
  getMyRegistrations,
  getRegistration,
  getEventRegistrations,
  cancelRegistration,
  updatePaymentStatus,
  checkInParticipant,
  getRegistrationStats
} = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Participant routes
router.post('/', protect, authorize('Participant', 'Organizer', 'Admin'), registerForEvent);
router.get('/my-registrations', protect, authorize('Participant', 'Organizer', 'Admin'), getMyRegistrations);
router.put('/:id/cancel', protect, authorize('Participant', 'Organizer', 'Admin'), cancelRegistration);

// Get single registration (owner or organizer/admin)
router.get('/:id', protect, getRegistration);

// Organizer routes
router.get('/event/:eventId', protect, authorize('Organizer', 'Admin'), getEventRegistrations);
router.put('/:id/payment', protect, authorize('Organizer', 'Admin'), updatePaymentStatus);
router.put('/:id/checkin', protect, authorize('Organizer', 'Admin'), checkInParticipant);

// Admin routes
router.get('/stats/overview', protect, authorize('Admin'), getRegistrationStats);

module.exports = router;
