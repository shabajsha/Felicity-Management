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
    if (event.status !== 'approved') {
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
      status: { $ne: 'rejected' }
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
      status: { $in: ['pending', 'confirmed'] }
    });

    if (registrationCount >= (event.capacity || event.maxParticipants)) {
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    // Team validation
    if (event.allowTeams) {
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
      participantName: `${req.user.firstName} ${req.user.lastName}`.trim(),
      email: req.user.email,
      isTeam: !!event.allowTeams,
      teamName,
      teamMembers,
      customFieldResponses: customFields,
      paymentAmount: event.registrationFee || 0,
      paymentStatus: (event.registrationFee || 0) > 0 ? 'pending' : 'free',
      status: (event.registrationFee || 0) > 0 ? 'pending' : 'confirmed'
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

    const stats = {
      total: registrations.length,
      confirmed: registrations.filter(r => r.status === 'confirmed').length,
      pending: registrations.filter(r => r.status === 'pending').length,
      cancelled: registrations.filter(r => r.status === 'rejected').length,
      checkedIn: registrations.filter(r => r.checkedIn).length,
      paymentPending: registrations.filter(r => r.paymentStatus === 'pending').length,
      paymentCompleted: registrations.filter(r => r.paymentStatus === 'paid').length
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
    if (registration.status === 'rejected') {
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

    registration.status = 'rejected';
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
    const { paymentStatus, paymentMethod, transactionId, amountPaid } = req.body;

    if (!['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
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
    if (amountPaid !== undefined) registration.amountPaid = amountPaid;

    // Update registration status if payment completed
    if (paymentStatus === 'paid' && registration.status === 'pending') {
      registration.status = 'confirmed';
      // Default amountPaid to expected paymentAmount when not provided
      if (registration.amountPaid === 0) {
        registration.amountPaid = registration.paymentAmount || 0;
      }
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
    if (registration.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Can only check-in confirmed registrations'
      });
    }

    // Check if already checked in
    if (registration.checkedIn) {
      return res.status(400).json({
        success: false,
        message: 'Participant already checked in',
        checkInTime: registration.checkInTime
      });
    }

    registration.checkedIn = true;
    registration.checkInTime = new Date();
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
    const confirmedRegistrations = await Registration.countDocuments({ status: 'confirmed' });
    const pendingRegistrations = await Registration.countDocuments({ status: 'pending' });
    const cancelledRegistrations = await Registration.countDocuments({ status: 'rejected' });
    const checkedInRegistrations = await Registration.countDocuments({ checkedIn: true });

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

// @desc    Get all registrations for organizer's events
// @route   GET /api/registrations/organizer/my-registrations
// @access  Private (Organizer)
exports.getOrganizerRegistrations = async (req, res, next) => {
  try {
    // Fetch events owned by organizer
    const events = await Event.find({ organizer: req.user.id }).select('_id title');
    const eventIds = events.map(e => e._id);

    const regs = await Registration.find({ event: { $in: eventIds } })
      .populate('user', 'firstName lastName email contactNumber')
      .populate('event', 'title date venue');

    res.status(200).json({
      success: true,
      count: regs.length,
      data: regs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update registration status
// @route   PUT /api/registrations/:id/status
// @access  Private (Owner or Organizer/Admin)
exports.updateRegistrationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'rejected', 'approved'];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    const event = await Event.findById(registration.event);

    // Check authorization
    if (
      registration.user.toString() !== req.user.id &&
      event?.organizer?.toString() !== req.user.id &&
      req.user.role !== 'Admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this registration'
      });
    }

    registration.status = status;
    await registration.save();

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};
