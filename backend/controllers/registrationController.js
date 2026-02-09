const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { issueTicket } = require('../utils/tickets');

// @desc    Register for an event
// @route   POST /api/registrations
// @access  Private (Participant)
exports.registerForEvent = async (req, res, next) => {
  try {
    const { eventId, teamName, teamMembers, customFields, teamLeader } = req.body;

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

    // Check registration deadline
    if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    // Check eligibility
    if (event.eligibility === 'IIIT' && req.user.participantType !== 'IIIT') {
      return res.status(403).json({
        success: false,
        message: 'Only IIIT participants can register for this event'
      });
    }
    if (event.eligibility === 'Non-IIIT' && req.user.participantType === 'IIIT') {
      return res.status(403).json({
        success: false,
        message: 'Only external participants can register for this event'
      });
    }

    // Check if user already registered (non-merchandise only)
    if (event.type !== 'Merchandise') {
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
    if (event.type === 'Merchandise' && (teamName || teamMembers)) {
      return res.status(400).json({
        success: false,
        message: 'Merchandise purchases are individual only'
      });
    }

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

    // Merchandise validation and pricing
    let merchandisePayload = null;
    let paymentAmount = event.registrationFee || 0;
    let paymentStatus = (paymentAmount > 0) ? 'pending' : 'free';
    let registrationStatus = (paymentAmount > 0) ? 'pending' : 'confirmed';

    if (event.type === 'Merchandise') {
      const payload = req.body.merchandise || {};
      const quantity = Math.max(1, Number(payload.quantity || req.body.quantity || 1));
      const purchaseLimit = event.merchandise?.purchaseLimit || 1;

      // Enforce per-participant purchase limit
      const previous = await Registration.find({ event: eventId, user: req.user.id });
      const purchased = previous.reduce((sum, reg) => sum + (reg.merchandise?.quantity || 0), 0);
      if (purchased + quantity > purchaseLimit) {
        return res.status(400).json({
          success: false,
          message: `Purchase limit is ${purchaseLimit} items per participant`
        });
      }

      let unitPrice = event.registrationFee || 0;
      let variantSku = payload.variantSku || null;
      let size = payload.size || null;
      let color = payload.color || null;

      if (event.merchandise?.variants?.length) {
        const variant = event.merchandise.variants.find(v =>
          (variantSku && v.sku === variantSku) ||
          (!variantSku && v.size === size && v.color === color)
        );

        if (!variant) {
          return res.status(400).json({
            success: false,
            message: 'Selected variant not available'
          });
        }

        if (variant.stock < quantity) {
          return res.status(400).json({
            success: false,
            message: 'Selected variant is out of stock'
          });
        }

        variantSku = variant.sku || variantSku;
        size = variant.size || size;
        color = variant.color || color;
        unitPrice = variant.price || unitPrice;

        variant.stock -= quantity;
      } else if (event.merchandise) {
        if ((event.merchandise.stock || 0) < quantity) {
          return res.status(400).json({
            success: false,
            message: 'Item is out of stock'
          });
        }
        event.merchandise.stock -= quantity;
      }

      paymentAmount = unitPrice * quantity;
      paymentStatus = paymentAmount > 0 ? 'pending' : 'free';
      registrationStatus = paymentAmount > 0 ? 'pending' : 'confirmed';

      merchandisePayload = {
        size,
        color,
        variantSku,
        quantity,
        unitPrice,
        totalPrice: paymentAmount
      };
    }

    // Create registration
    const registration = await Registration.create({
      event: eventId,
      user: req.user.id,
      participantName: `${req.user.firstName} ${req.user.lastName}`.trim(),
      email: req.user.email,
      isTeam: !!event.allowTeams,
      teamName,
      teamLeader,
      teamMembers,
      customFieldResponses: customFields,
      merchandise: merchandisePayload,
      paymentAmount,
      paymentStatus,
      amountPaid: paymentStatus === 'paid' ? paymentAmount : 0,
      status: registrationStatus
    });

    // Update stock and registered count on the event
    event.registered = (event.registered || 0) + 1;
    await event.save();

    await registration.populate('event', 'title date venue');

    let issued = registration;
    const shouldIssueTicket = event.type !== 'Merchandise' || ['paid', 'free'].includes(paymentStatus);
    if (shouldIssueTicket) {
      issued = await issueTicket(registration, event);
    }

    res.status(201).json({
      success: true,
      data: issued
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

    if (registration.status !== 'rejected') {
      await Event.findByIdAndUpdate(registration.event, { $inc: { registered: -1 } });
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

    if (!['pending', 'paid', 'failed', 'free', 'refunded'].includes(paymentStatus)) {
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

    if (paymentStatus === 'paid' && !registration.ticketQr) {
      await issueTicket(registration, registration.event);
    }

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

    const previousStatus = registration.status;
    registration.status = status;
    await registration.save();

    if (previousStatus !== 'rejected' && status === 'rejected') {
      await Event.findByIdAndUpdate(registration.event, { $inc: { registered: -1 } });
    }
    if (previousStatus === 'rejected' && status !== 'rejected') {
      await Event.findByIdAndUpdate(registration.event, { $inc: { registered: 1 } });
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload payment proof
// @route   POST /api/registrations/:id/payment-proof
// @access  Private (Owner)
exports.uploadPaymentProof = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof image is required'
      });
    }

    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload payment proof'
      });
    }

    registration.paymentScreenshot = `/uploads/${req.file.filename}`;
    if (registration.paymentStatus === 'pending' || registration.paymentStatus === 'failed') {
      registration.paymentStatus = 'pending';
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
