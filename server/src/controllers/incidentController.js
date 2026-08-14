import mongoose from 'mongoose';
import { Incident } from '../models/Incident.js';
import { seedInitialIncidents } from '../config/seedData.js';
import { deleteCloudinaryImage } from '../config/cloudinary.js';

// Helper to fetch populated incident
const fetchPopulatedIncident = async (id) => {
  return await Incident.findById(id)
    .populate('reportedBy', 'name avatarUrl role')
    .populate('comments.author', 'name avatarUrl role')
    .populate('comments.replies.author', 'name avatarUrl role');
};

// @desc    Get all danger feed incidents
// @route   GET /api/incidents
export const getIncidents = async (req, res, next) => {
  try {
    await seedInitialIncidents();
    const incidents = await Incident.find()
      .populate('reportedBy', 'name avatarUrl role')
      .populate('comments.author', 'name avatarUrl role')
      .populate('comments.replies.author', 'name avatarUrl role')
      .sort({ createdAt: -1 });
    res.json(incidents);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single incident details & discussion thread
// @route   GET /api/incidents/:id
export const getIncidentById = async (req, res, next) => {
  try {
    const incident = await fetchPopulatedIncident(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    res.json(incident);
  } catch (error) {
    next(error);
  }
};

// @desc    Report new incident
// @route   POST /api/incidents
export const createIncident = async (req, res, next) => {
  try {
    const { title, description, locationName, longitude, latitude, severity, imageUrl } = req.body;

    const newIncident = await Incident.create({
      title,
      description,
      locationName: locationName || 'Current Location',
      location: {
        type: 'Point',
        coordinates: [longitude || 90.4125, latitude || 23.8103],
      },
      severity: severity || 'Med Severity',
      reportedBy: req.user._id,
      imageUrl,
    });

    const populated = await fetchPopulatedIncident(newIncident._id);
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update an incident report (Owner/Admin)
// @route   PUT /api/incidents/:id
export const updateIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const userIdStr = req.user._id.toString();
    const isOwner = incident.reportedBy && incident.reportedBy.toString() === userIdStr;
    const isAdminOrOperator = ['admin', 'operator'].includes(req.user.role);

    if (!isOwner && !isAdminOrOperator) {
      return res.status(403).json({ message: 'Not authorized to edit this incident report' });
    }

    const { title, description, locationName, severity, imageUrl } = req.body;

    if (imageUrl !== undefined && incident.imageUrl && incident.imageUrl !== imageUrl) {
      deleteCloudinaryImage(incident.imageUrl);
    }

    incident.title = title || incident.title;
    incident.description = description || incident.description;
    incident.locationName = locationName || incident.locationName;
    incident.severity = severity || incident.severity;
    if (imageUrl !== undefined) incident.imageUrl = imageUrl;
    incident.isEdited = true;

    await incident.save();
    const populated = await fetchPopulatedIncident(incident._id);
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an incident report & associated Cloudinary assets (Owner/Admin)
// @route   DELETE /api/incidents/:id
export const deleteIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const userIdStr = req.user._id.toString();
    const isOwner = incident.reportedBy && incident.reportedBy.toString() === userIdStr;
    const isAdminOrOperator = ['admin', 'operator'].includes(req.user.role);

    if (!isOwner && !isAdminOrOperator) {
      return res.status(403).json({ message: 'Not authorized to delete this incident report' });
    }

    // Remove Cloudinary image asset for main incident if present
    if (incident.imageUrl) {
      deleteCloudinaryImage(incident.imageUrl);
    }

    // Remove Cloudinary image assets for comments if present
    if (Array.isArray(incident.comments)) {
      for (const comment of incident.comments) {
        if (comment.imageUrl) {
          deleteCloudinaryImage(comment.imageUrl);
        }
      }
    }

    await Incident.findByIdAndDelete(req.params.id);
    res.json({ message: 'Incident report and Cloudinary photo assets deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Vote on incident (Exclusive Upvote / Downvote)
// @route   POST /api/incidents/:id/vote
export const voteIncident = async (req, res, next) => {
  try {
    const { voteType } = req.body; // 'up' or 'down'
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const userIdStr = req.user._id.toString();

    // Sanitize vote arrays
    incident.upvotes = (incident.upvotes || []).filter(
      (id) => id && mongoose.Types.ObjectId.isValid(id.toString())
    );
    incident.downvotes = (incident.downvotes || []).filter(
      (id) => id && mongoose.Types.ObjectId.isValid(id.toString())
    );

    const upIndex = incident.upvotes.findIndex((id) => id.toString() === userIdStr);
    const downIndex = incident.downvotes.findIndex((id) => id.toString() === userIdStr);

    if (voteType === 'up') {
      if (upIndex > -1) {
        // Toggle off upvote
        incident.upvotes.splice(upIndex, 1);
      } else {
        // Add upvote & remove downvote if present
        incident.upvotes.push(req.user._id);
        if (downIndex > -1) incident.downvotes.splice(downIndex, 1);
      }
    } else if (voteType === 'down') {
      if (downIndex > -1) {
        // Toggle off downvote
        incident.downvotes.splice(downIndex, 1);
      } else {
        // Add downvote & remove upvote if present
        incident.downvotes.push(req.user._id);
        if (upIndex > -1) incident.upvotes.splice(upIndex, 1);
      }
    }

    // Auto-mark Community Verified if upvotes >= 5
    incident.isVerified = incident.upvotes.length >= 5;

    await incident.save();
    const populated = await fetchPopulatedIncident(incident._id);
    res.json(populated);
  } catch (error) {
    console.error('[Vote Incident Error]', error);
    next(error);
  }
};

// Legacy upvote endpoint helper
export const upvoteIncident = voteIncident;

// @desc    Add comment to discussion thread
// @route   POST /api/incidents/:id/comments
export const addComment = async (req, res, next) => {
  try {
    const { text, imageUrl } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const newComment = {
      author: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role === 'guardian' ? 'Verified Guardian' : 'Commuter',
      authorAvatar: req.user.avatarUrl || '',
      text: text.trim(),
      imageUrl: imageUrl || '',
      isEdited: false,
      likes: [],
      dislikes: [],
      replies: [],
      createdAt: new Date(),
    };

    incident.comments.push(newComment);
    await incident.save();

    const populated = await fetchPopulatedIncident(incident._id);
    res.status(201).json(populated);
  } catch (error) {
    console.error('[Add Comment Error]', error);
    next(error);
  }
};

// @desc    Update a comment text & image (Author/Admin)
// @route   PUT /api/incidents/:id/comments/:commentId
export const updateComment = async (req, res, next) => {
  try {
    const { text, imageUrl } = req.body;
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const comment = incident.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const userIdStr = req.user._id.toString();
    const isAuthor = comment.author && comment.author.toString() === userIdStr;
    const isAdminOrOperator = ['admin', 'operator'].includes(req.user.role);

    if (!isAuthor && !isAdminOrOperator) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }

    if (text) comment.text = text.trim();
    if (imageUrl !== undefined) {
      if (comment.imageUrl && comment.imageUrl !== imageUrl) {
        deleteCloudinaryImage(comment.imageUrl);
      }
      comment.imageUrl = imageUrl;
    }
    comment.isEdited = true;

    await incident.save();
    const populated = await fetchPopulatedIncident(incident._id);
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment & associated Cloudinary photo asset (Author/Admin)
// @route   DELETE /api/incidents/:id/comments/:commentId
export const deleteComment = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const comment = incident.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const userIdStr = req.user._id.toString();
    const isAuthor = comment.author && comment.author.toString() === userIdStr;
    const isAdminOrOperator = ['admin', 'operator'].includes(req.user.role);

    if (!isAuthor && !isAdminOrOperator) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Delete comment Cloudinary image if present
    if (comment.imageUrl) {
      deleteCloudinaryImage(comment.imageUrl);
    }

    comment.deleteOne();
    await incident.save();

    const populated = await fetchPopulatedIncident(incident._id);
    res.json(populated);
  } catch (error) {
    console.error('[Delete Comment Error]', error);
    next(error);
  }
};

// @desc    Vote on a comment (Like / Dislike)
// @route   POST /api/incidents/:id/comments/:commentId/vote
export const voteComment = async (req, res, next) => {
  try {
    const { voteType } = req.body; // 'like' or 'dislike'
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const comment = incident.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const userIdStr = req.user._id.toString();

    comment.likes = (comment.likes || []).filter(
      (id) => id && mongoose.Types.ObjectId.isValid(id.toString())
    );
    comment.dislikes = (comment.dislikes || []).filter(
      (id) => id && mongoose.Types.ObjectId.isValid(id.toString())
    );

    const likeIdx = comment.likes.findIndex((id) => id.toString() === userIdStr);
    const dislikeIdx = comment.dislikes.findIndex((id) => id.toString() === userIdStr);

    if (voteType === 'like') {
      if (likeIdx > -1) {
        comment.likes.splice(likeIdx, 1);
      } else {
        comment.likes.push(req.user._id);
        if (dislikeIdx > -1) comment.dislikes.splice(dislikeIdx, 1);
      }
    } else if (voteType === 'dislike') {
      if (dislikeIdx > -1) {
        comment.dislikes.splice(dislikeIdx, 1);
      } else {
        comment.dislikes.push(req.user._id);
        if (likeIdx > -1) comment.likes.splice(likeIdx, 1);
      }
    }

    await incident.save();
    const populated = await fetchPopulatedIncident(incident._id);
    res.json(populated);
  } catch (error) {
    console.error('[Vote Comment Error]', error);
    next(error);
  }
};

// @desc    Reply to a comment
// @route   POST /api/incidents/:id/comments/:commentId/reply
export const addCommentReply = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const comment = incident.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = {
      author: req.user._id,
      authorName: req.user.name,
      authorAvatar: req.user.avatarUrl || '',
      text: text.trim(),
      isEdited: false,
      createdAt: new Date(),
    };

    if (!Array.isArray(comment.replies)) comment.replies = [];
    comment.replies.push(reply);

    await incident.save();
    const populated = await fetchPopulatedIncident(incident._id);
    res.status(201).json(populated);
  } catch (error) {
    console.error('[Reply Comment Error]', error);
    next(error);
  }
};

// @desc    Update a comment reply (Author/Admin)
// @route   PUT /api/incidents/:id/comments/:commentId/replies/:replyId
export const updateCommentReply = async (req, res, next) => {
  try {
    const { text } = req.body;
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const comment = incident.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    const userIdStr = req.user._id.toString();
    const isAuthor = reply.author && reply.author.toString() === userIdStr;
    const isAdminOrOperator = ['admin', 'operator'].includes(req.user.role);

    if (!isAuthor && !isAdminOrOperator) {
      return res.status(403).json({ message: 'Not authorized to edit this reply' });
    }

    if (text) reply.text = text.trim();
    reply.isEdited = true;

    await incident.save();
    const populated = await fetchPopulatedIncident(incident._id);
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment reply (Author/Admin)
// @route   DELETE /api/incidents/:id/comments/:commentId/replies/:replyId
export const deleteCommentReply = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const comment = incident.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    const userIdStr = req.user._id.toString();
    const isAuthor = reply.author && reply.author.toString() === userIdStr;
    const isAdminOrOperator = ['admin', 'operator'].includes(req.user.role);

    if (!isAuthor && !isAdminOrOperator) {
      return res.status(403).json({ message: 'Not authorized to delete this reply' });
    }

    reply.deleteOne();
    await incident.save();

    const populated = await fetchPopulatedIncident(incident._id);
    res.json(populated);
  } catch (error) {
    next(error);
  }
};
