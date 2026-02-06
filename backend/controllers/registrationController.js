const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');

// @desc    Register for an event
// @route   POST /api/registrations
// @access  Private (Participant)
exports.registerForEvent = async (req, res, next) => {
  try {
    const { eventId, teamName, teamMembers, customFields } = req.body;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is approved
    if (event.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for unapproved event'
      });
    }

    // Check if event date has passed
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for past events'
      });
    }

    // Check if user already registered
    const existingRegistration = await Registration.findOne({
      event: eventId,
      user: req.user.id,
      status: { $ne: 'Cancelled' }
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event'
      });
    }

    // Check capacity
    const registrationCount = await Registration.countDocuments({
      event: eventId,
      status: { $in: ['Pending', 'Confirmed'] }
    });

    if (registrationCount >= event.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    // Team validation
    if (event.requiresTeam) {
      if (!teamName || !teamMembers || teamMembers.length < event.minTeamSize - 1) {
        return res.status(400).json({
          success: false,
          message: `Team requires minimum ${event.minTeamSize} members`
        });
      }

      if (teamMembers.length > event.maxTeamSize - 1) {
        return res.status(400).json({
          success: false,
          message: `Team cannot exceed ${event.maxTeamSize} members`
        });
      }
    } else if (teamName || teamMembers) {
      return res.status(400).json({
        success: false,
        message: 'This event does not allow team registration'
      });
    }

    // Create registration
    const registration = await Registration.create({
      event: eventId,
      user: req.user.id,
      teamName,
      teamMembers,
      customFields,
      amountPaid: event.fees,
      paymentStatus: event.fees > 0 ? 'Pending' : 'Not Required',
      status: event.fees > 0 ? 'Pending' : 'Confirmed'
    });

    await registration.populate('event', 'title date venue');

    res.status(201).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my registrations
// @route   GET /api/registrations/my-registrations
// @access  Private (Participant)
exports.getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({ user: req.user.id })
      .populate('event', 'title date venue organizer category fees')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single registration
// @route   GET /api/registrations/:id
// @access  Private (Owner or Organizer/Admin)
exports.getRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate('user', 'firstName lastName email contactNumber')
      .populate('event', 'title date venue organizer');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check authorization
    if (
      registration.user._id.toString() !== req.user.id &&
      registration.event.organizer.toString() !== req.user.id &&
      req.user.role !== 'Admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this registration'
      });
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get registrations for an event
// @route   GET /api/registrations/event/:eventId
// @access  Private (Organizer/Admin)
exports.getEventRegistrations = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view event registrations'
      });
    }

    const registrations = await Registration.find({ event: req.params.eventId })
      .populate('user', 'firstName lastName email contactNumber participantType')
      .sort('-createdAt');

    // Calculate statistics
    const stats = {
      total: registrations.length,
      confirmed: registrations.filter(r => r.status === 'Confirmed').length,
      pending: registrations.filter(r => r.status === 'Pending').length,
      cancelled: registrations.filter(r => r.status === 'Cancelled').length,
      checkedIn: registrations.filter(r => r.checkIn.status).length,
      paymentPending: registrations.filter(r => r.paymentStatus === 'Pending').length,
      paymentCompleted: registrations.filter(r => r.paymentStatus === 'Completed').length
    };

    res.status(200).json({
      success: true,
      count: registrations.length,
      stats,
      data: registrations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel registration
// @route   PUT /api/registrations/:id/cancel
// @access  Private (Owner)
exports.cancelRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check if user owns this registration
    if (registration.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this registration'
      });
    }

    // Check if already cancelled
    if (registration.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Registration already cancelled'
      });
    }

    // Check if event has already happened
    const event = await Event.findById(registration.event);
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel registration for past events'
      });
    }

    registration.status = 'Cancelled';
    await registration.save();

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment status
// @route   PUT /api/registrations/:id/payment
// @access  Private (Organizer/Admin)
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus, paymentMethod, transactionId } = req.body;

    if (!['Pending', 'Completed', 'Failed', 'Refunded'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const registration = await Registration.findById(req.params.id).populate('event');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check authorization
    if (
      registration.event.organizer.toString() !== req.user.id &&
      req.user.role !== 'Admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update payment status'
      });
    }

    registration.paymentStatus = paymentStatus;
    
    if (paymentMethod) registration.paymentMethod = paymentMethod;
    if (transactionId) registration.transactionId = transactionId;

    // Update registration status if payment completed
    if (paymentStatus === 'Completed' && registration.status === 'Pending') {
      registration.status = 'Confirmed';
    }

    await registration.save();

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check-in participant
// @route   PUT /api/registrations/:id/checkin
// @access  Private (Organizer/Admin)
exports.checkInParticipant = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id).populate('event');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check authorization
    if (
      registration.event.organizer.toString() !== req.user.id &&
      req.user.role !== 'Admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to check-in participants'
      });
    }

    // Check if registration is confirmed
    if (registration.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Can only check-in confirmed registrations'
      });
    }

    // Check if already checked in
    if (registration.checkIn.status) {
      return res.status(400).json({
        success: false,
        message: 'Participant already checked in',
        checkInTime: registration.checkIn.timestamp
      });
    }

    registration.checkIn.status = true;
    registration.checkIn.timestamp = new Date();
    await registration.save();

    res.status(200).json({
      success: true,
      message: 'Check-in successful',
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get registration statistics
// @route   GET /api/registrations/stats/overview
// @access  Private (Admin)
exports.getRegistrationStats = async (req, res, next) => {
  try {
    const totalRegistrations = await Registration.countDocuments();
    const confirmedRegistrations = await Registration.countDocuments({ status: 'Confirmed' });
    const pendingRegistrations = await Registration.countDocuments({ status: 'Pending' });
    const cancelledRegistrations = await Registration.countDocuments({ status: 'Cancelled' });
    const checkedInRegistrations = await Registration.countDocuments({ 'checkIn.status': true });

    const paymentStats = await Registration.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amountPaid' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalRegistrations,
        confirmed: confirmedRegistrations,
        pending: pendingRegistrations,
        cancelled: cancelledRegistrations,
        checkedIn: checkedInRegistrations,
        payments: paymentStats
      }
    });
  } catch (error) {
    next(error);
  }
};
