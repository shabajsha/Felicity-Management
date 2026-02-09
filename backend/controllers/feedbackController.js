const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

// @desc    Submit feedback for an event
// @route   POST /api/feedback
// @access  Private (Registered participants who attended)
exports.submitFeedback = async (req, res, next) => {
  try {
    const { eventId, rating, categories, comment, isAnonymous } = req.body;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event has passed
    if (new Date(event.date) > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit feedback for upcoming events'
      });
    }

    // Check if user attended the event
    const registration = await Registration.findOne({
      event: eventId,
      user: req.user.id,
      status: 'confirmed',
      checkedIn: true
    });

    if (!registration) {
      return res.status(403).json({
        success: false,
        message: 'Only participants who attended the event can submit feedback'
      });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({
      event: eventId,
      user: req.user.id
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this event'
      });
    }

    const feedback = await Feedback.create({
      event: eventId,
      user: req.user.id,
      rating,
      categories,
      comment,
      isAnonymous
    });

    await feedback.populate('user', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedback for an event
// @route   GET /api/feedback/event/:eventId
// @access  Public
exports.getEventFeedback = async (req, res, next) => {
  try {
    const { sort = '-createdAt', minRating } = req.query;

    const query = { event: req.params.eventId, isPublished: true };
    
    if (minRating) {
      query.rating = { $gte: parseInt(minRating) };
    }

    const feedbacks = await Feedback.find(query)
      .populate('user', 'firstName lastName')
      .sort(sort);

    // Calculate statistics
    const stats = {
      totalFeedbacks: feedbacks.length,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      categoryAverages: {
        organization: 0,
        content: 0,
        venue: 0,
        value: 0
      }
    };

    if (feedbacks.length > 0) {
      stats.averageRating = (
        feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length
      ).toFixed(1);

      feedbacks.forEach(fb => {
        stats.ratingDistribution[fb.rating]++;
        
        if (fb.categories) {
          if (fb.categories.organization) stats.categoryAverages.organization += fb.categories.organization;
          if (fb.categories.content) stats.categoryAverages.content += fb.categories.content;
          if (fb.categories.venue) stats.categoryAverages.venue += fb.categories.venue;
          if (fb.categories.value) stats.categoryAverages.value += fb.categories.value;
        }
      });

      // Calculate category averages
      Object.keys(stats.categoryAverages).forEach(key => {
        if (stats.categoryAverages[key] > 0) {
          stats.categoryAverages[key] = (stats.categoryAverages[key] / feedbacks.length).toFixed(1);
        }
      });
    }

    // Hide user info for anonymous feedback
    const sanitizedFeedbacks = feedbacks.map(fb => {
      const fbObj = fb.toObject();
      if (fb.isAnonymous) {
        fbObj.user = null;
      }
      return fbObj;
    });

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      stats,
      data: sanitizedFeedbacks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single feedback
// @route   GET /api/feedback/:id
// @access  Private (Owner or Organizer or Admin)
exports.getFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('event', 'title organizer');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check authorization
    const isOwner = feedback.user._id.toString() === req.user.id;
    const isOrganizer = feedback.event.organizer.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin';

    if (!isOwner && !isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this feedback'
      });
    }

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update feedback
// @route   PUT /api/feedback/:id
// @access  Private (Owner only)
exports.updateFeedback = async (req, res, next) => {
  try {
    let feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user owns this feedback
    if (feedback.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this feedback'
      });
    }

    const { rating, categories, comment, isAnonymous } = req.body;

    if (rating) feedback.rating = rating;
    if (categories) feedback.categories = categories;
    if (comment !== undefined) feedback.comment = comment;
    if (isAnonymous !== undefined) feedback.isAnonymous = isAnonymous;

    await feedback.save();

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private (Owner or Admin)
exports.deleteFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check authorization
    const isOwner = feedback.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this feedback'
      });
    }

    await feedback.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark feedback as helpful
// @route   PUT /api/feedback/:id/helpful
// @access  Private
exports.markHelpful = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user already marked this as helpful
    if (feedback.helpfulBy && feedback.helpfulBy.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You have already marked this feedback as helpful'
      });
    }

    // Add user to helpfulBy array and increment count
    if (!feedback.helpfulBy) {
      feedback.helpfulBy = [];
    }
    feedback.helpfulBy.push(req.user.id);
    feedback.helpful += 1;
    await feedback.save();

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's feedback history
// @route   GET /api/feedback/my-feedback
// @access  Private
exports.getMyFeedback = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find({ user: req.user.id })
      .populate('event', 'title date')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
  } catch (error) {
    next(error);
  }
};
