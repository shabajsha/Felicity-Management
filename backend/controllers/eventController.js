const Event = require('../models/Event');
const User = require('../models/User');

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Organizer only)
exports.createEvent = async (req, res, next) => {
  try {
    // Add organizer to req.body
    req.body.organizer = req.user.id;

    const event = await Event.create(req.body);

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from filtering
    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Build query object
    let queryObj = {};

    // Search functionality
    if (req.query.search) {
      queryObj.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { venue: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (reqQuery.category) {
      queryObj.category = reqQuery.category;
    }

    // Filter by status
    if (reqQuery.status) {
      queryObj.status = reqQuery.status;
    } else {
      // Default: only show approved events for non-admin users
      if (!req.user || req.user.role !== 'Admin') {
        queryObj.status = 'Approved';
      }
    }

    // Filter by organizer
    if (reqQuery.organizer) {
      queryObj.organizer = reqQuery.organizer;
    }

    // Filter by date range
    if (reqQuery.dateFrom || reqQuery.dateTo) {
      queryObj.date = {};
      if (reqQuery.dateFrom) {
        queryObj.date.$gte = new Date(reqQuery.dateFrom);
      }
      if (reqQuery.dateTo) {
        queryObj.date.$lte = new Date(reqQuery.dateTo);
      }
    }

    // Filter by team requirement
    if (reqQuery.requiresTeam !== undefined) {
      queryObj.requiresTeam = reqQuery.requiresTeam === 'true';
    }

    // Create query
    let query = Event.find(queryObj).populate('organizer', 'firstName lastName email');

    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      // Default sort by date (upcoming first)
      query = query.sort('date');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Event.countDocuments(queryObj);

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const events = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      pagination,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'firstName lastName email contactNumber')
      .populate('club', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organizer - own events or Admin)
exports.updateEvent = async (req, res, next) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is event organizer or admin
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    // Don't allow changing organizer
    delete req.body.organizer;

    // If event was approved and being modified, set back to pending
    if (event.status === 'Approved' && req.user.role !== 'Admin') {
      req.body.status = 'Pending';
    }

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Organizer - own events or Admin)
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is event organizer or admin
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    await event.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject event
// @route   PUT /api/events/:id/approve
// @access  Private (Admin only)
exports.approveEvent = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either Approved or Rejected'
      });
    }

    if (status === 'Rejected' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    event.status = status;
    if (status === 'Rejected') {
      event.rejectionReason = rejectionReason;
    }

    await event.save();

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get organizer's events
// @route   GET /api/events/organizer/my-events
// @access  Private (Organizer only)
exports.getMyEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user.id })
      .sort('-createdAt')
      .populate('club', 'name');

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get event statistics
// @route   GET /api/events/:id/stats
// @access  Private (Organizer - own events or Admin)
exports.getEventStats = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

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
        message: 'Not authorized to view event statistics'
      });
    }

    // Get registration count (will be implemented in Phase 3)
    // For now, just return basic event info
    const stats = {
      eventId: event._id,
      eventTitle: event.title,
      totalCapacity: event.maxCapacity,
      registeredParticipants: 0, // Will be calculated from Registration model
      availableSpots: event.maxCapacity,
      status: event.status,
      requiresTeam: event.requiresTeam,
      requiresPayment: event.fees > 0
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
