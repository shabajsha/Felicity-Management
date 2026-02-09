const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Club = require('../models/Club');

// Helper: generate a simple random password
const generatePassword = () => `Org@${Math.random().toString(36).slice(2, 8)}`;

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};
    
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's registrations count
    const registrationCount = await Registration.countDocuments({ user: req.params.id });
    
    // If organizer, get events count
    let eventCount = 0;
    if (user.role === 'Organizer') {
      eventCount = await Event.countDocuments({ organizer: req.params.id });
    }

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        registrationCount,
        eventCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res, next) => {
  try {
    const { password, ...updateData } = req.body;

    // Don't allow password update through this route
    if (password) {
      return res.status(400).json({
        success: false,
        message: 'Use password update endpoint to change password'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Deactivate user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Soft delete - deactivate user
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Promote user to organizer
// @route   PUT /api/admin/users/:id/promote
// @access  Private (Admin only)
exports.promoteToOrganizer = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'Participant') {
      return res.status(400).json({
        success: false,
        message: 'Can only promote participants to organizers'
      });
    }

    user.role = 'Organizer';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User promoted to Organizer',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getSystemStats = async (req, res, next) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Event statistics
    const totalEvents = await Event.countDocuments();
    const eventsByStatus = await Event.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const upcomingEvents = await Event.countDocuments({
      status: 'approved',
      date: { $gte: new Date() }
    });

    // Registration statistics
    const totalRegistrations = await Registration.countDocuments();
    const confirmedRegistrations = await Registration.countDocuments({ 
      status: 'confirmed' 
    });
    const registrationsByStatus = await Registration.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Payment statistics
    const paymentStats = await Registration.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amountPaid' }
        }
      }
    ]);

    // Club statistics
    const totalClubs = await Club.countDocuments({ isActive: true });

    // Recent activity
    const recentUsers = await User.find()
      .select('firstName lastName email role createdAt')
      .sort('-createdAt')
      .limit(5);

    const recentEvents = await Event.find()
      .select('title date status organizer')
      .populate('organizer', 'firstName lastName')
      .sort('-createdAt')
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: usersByRole
        },
        events: {
          total: totalEvents,
          byStatus: eventsByStatus,
          upcoming: upcomingEvents
        },
        registrations: {
          total: totalRegistrations,
          confirmed: confirmedRegistrations,
          byStatus: registrationsByStatus
        },
        payments: paymentStats,
        clubs: totalClubs,
        recentActivity: {
          users: recentUsers,
          events: recentEvents
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending events for approval
// @route   GET /api/admin/pending-events
// @access  Private (Admin only)
exports.getPendingEvents = async (req, res, next) => {
  try {
    const pendingEvents = await Event.find({ status: 'pending' })
      .populate('organizer', 'firstName lastName email')
      .populate('clubId', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: pendingEvents.length,
      data: pendingEvents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create an organizer account (admin provisioned)
// @route   POST /api/admin/organizers
// @access  Private (Admin only)
exports.createOrganizer = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      contactNumber,
      organizerName,
      category,
      description,
      contactEmail,
      contactPhone
    } = req.body;

    // Basic uniqueness check
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const password = generatePassword();

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      contactNumber,
      role: 'Organizer',
      password,
      organizerProfile: {
        name: organizerName || `${firstName} ${lastName}`,
        category,
        description,
        contactEmail: contactEmail || email,
        contactNumber: contactPhone || contactNumber
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        organizerProfile: user.organizerProfile
      },
      credentials: {
        email: user.email,
        password
      }
    });
  } catch (error) {
    next(error);
  }
};
