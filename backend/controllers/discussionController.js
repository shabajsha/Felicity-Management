const Discussion = require('../models/Discussion');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

// @desc    Create a discussion
// @route   POST /api/discussions
// @access  Private (Registered participants for the event)
exports.createDiscussion = async (req, res, next) => {
  try {
    const { eventId, title, content, category } = req.body;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is registered for the event (or is organizer/admin)
    const isRegistered = await Registration.findOne({
      event: eventId,
      user: req.user.id,
      status: 'Confirmed'
    });

    const isOrganizer = event.organizer.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin';

    if (!isRegistered && !isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only registered participants can create discussions'
      });
    }

    const discussion = await Discussion.create({
      event: eventId,
      author: req.user.id,
      title,
      content,
      category
    });

    await discussion.populate('author', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: discussion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get discussions for an event
// @route   GET /api/discussions/event/:eventId
// @access  Public
exports.getEventDiscussions = async (req, res, next) => {
  try {
    const { category, sort = '-createdAt' } = req.query;

    const query = { event: req.params.eventId };
    if (category) {
      query.category = category;
    }

    const discussions = await Discussion.find(query)
      .populate('author', 'firstName lastName')
      .populate('replies.author', 'firstName lastName')
      .sort(sort);

    res.status(200).json({
      success: true,
      count: discussions.length,
      data: discussions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single discussion
// @route   GET /api/discussions/:id
// @access  Public
exports.getDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('author', 'firstName lastName')
      .populate('replies.author', 'firstName lastName')
      .populate('event', 'title');

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      });
    }

    // Increment view count
    discussion.viewCount += 1;
    await discussion.save();

    res.status(200).json({
      success: true,
      data: discussion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to a discussion
// @route   POST /api/discussions/:id/reply
// @access  Private (Registered participants)
exports.replyToDiscussion = async (req, res, next) => {
  try {
    const { content } = req.body;

    const discussion = await Discussion.findById(req.params.id).populate('event');

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      });
    }

    // Check if user is registered for the event (or is organizer/admin)
    const isRegistered = await Registration.findOne({
      event: discussion.event._id,
      user: req.user.id,
      status: 'Confirmed'
    });

    const isOrganizer = discussion.event.organizer.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin';

    if (!isRegistered && !isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only registered participants can reply'
      });
    }

    discussion.replies.push({
      author: req.user.id,
      content
    });

    await discussion.save();
    await discussion.populate('replies.author', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: discussion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update discussion
// @route   PUT /api/discussions/:id
// @access  Private (Author or Admin)
exports.updateDiscussion = async (req, res, next) => {
  try {
    let discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      });
    }

    // Check authorization
    if (discussion.author.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this discussion'
      });
    }

    const { title, content, category, isResolved } = req.body;

    if (title) discussion.title = title;
    if (content) discussion.content = content;
    if (category) discussion.category = category;
    if (isResolved !== undefined) discussion.isResolved = isResolved;

    await discussion.save();

    res.status(200).json({
      success: true,
      data: discussion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete discussion
// @route   DELETE /api/discussions/:id
// @access  Private (Author or Organizer or Admin)
exports.deleteDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id).populate('event');

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      });
    }

    // Check authorization
    const isAuthor = discussion.author.toString() === req.user.id;
    const isOrganizer = discussion.event.organizer.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin';

    if (!isAuthor && !isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this discussion'
      });
    }

    await discussion.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pin/Unpin discussion
// @route   PUT /api/discussions/:id/pin
// @access  Private (Organizer or Admin)
exports.togglePin = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id).populate('event');

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      });
    }

    // Check authorization
    const isOrganizer = discussion.event.organizer.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin';

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pin discussions'
      });
    }

    discussion.isPinned = !discussion.isPinned;
    await discussion.save();

    res.status(200).json({
      success: true,
      data: discussion
    });
  } catch (error) {
    next(error);
  }
};
