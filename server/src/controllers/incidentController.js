import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import { Incident } from '../models/Incident.js';
import { seedInitialIncidents } from '../config/seedData.js';
import { deleteCloudinaryImage } from '../config/cloudinary.js';

// Helper to fetch populated incident
const fetchPopulatedIncident = async (id) => {
  const incident = await Incident.findById(id)
    .populate('reportedBy', 'name avatarUrl role')
    .populate('comments.author', 'name avatarUrl role')
    .populate('comments.replies.author', 'name avatarUrl role');

  if (incident?.comments) {
    incident.comments.sort((first, second) => (
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    ));
  }

  return incident;
};

const pdfValue = (value, fallback = 'Not provided') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

// @desc    Export an incident and its discussion as a law-enforcement PDF
// @route   GET /api/incidents/:id/pdf
export const exportIncidentPdf = async (req, res, next) => {
  try {
    const incident = await fetchPopulatedIncident(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    const document = new PDFDocument({
      margin: 48,
      info: { Title: `PATHPROHORI Incident Report - ${incident.title}` },
    });
    const filename = `pathprohori-incident-${incident._id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    document.pipe(res);

    document.fontSize(20).fillColor('#7f1d1d').text('PATHPROHORI', { align: 'center' });
    document.fontSize(14).fillColor('#111827').text('LAW-ENFORCEMENT INCIDENT REPORT', { align: 'center' });
    document.moveDown(1);
    document.fontSize(9).fillColor('#4b5563').text(`Generated: ${new Date().toISOString()}`, { align: 'right' });

    const writeField = (label, value) => {
      document.fontSize(10).fillColor('#111827').font('Helvetica-Bold').text(`${label}: `, { continued: true });
      document.font('Helvetica').fillColor('#374151').text(pdfValue(value));
    };

    document.moveDown(0.5).fontSize(13).fillColor('#7f1d1d').font('Helvetica-Bold').text('Incident Details');
    document.moveDown(0.3);
    writeField('Report ID', incident._id);
    writeField('Title', incident.title);
    writeField('Severity', incident.severity);
    writeField('Status', incident.isVerified ? 'Community Verified' : 'Unverified');
    writeField('Location', incident.locationName);
    writeField('Coordinates', incident.location?.coordinates?.join(', '));
    writeField('Reported By', incident.reportedBy?.name);
    writeField('Reporter Role', incident.reportedBy?.role);
    writeField('Created At', incident.createdAt && new Date(incident.createdAt).toISOString());
    writeField('Expires At', incident.expiresAt && new Date(incident.expiresAt).toISOString());
    writeField('Community Votes', `${incident.upvotes?.length || 0} up / ${incident.downvotes?.length || 0} down`);

    document.moveDown(0.6).fontSize(13).fillColor('#7f1d1d').font('Helvetica-Bold').text('Description');
    document.moveDown(0.3).font('Helvetica').fontSize(10).fillColor('#374151').text(pdfValue(incident.description));
    if (incident.imageUrl) writeField('Incident Evidence', incident.imageUrl);

    document.moveDown(0.8).fontSize(13).fillColor('#7f1d1d').font('Helvetica-Bold').text(`Discussion and Updates (${incident.comments?.length || 0})`);
    document.moveDown(0.3);
    if (!incident.comments?.length) {
      document.font('Helvetica').fontSize(10).fillColor('#374151').text('No discussion updates were recorded.');
    } else {
      incident.comments.forEach((comment, index) => {
        document.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(`${index + 1}. ${pdfValue(comment.authorName, comment.author?.name)}`);
        document.font('Helvetica').fillColor('#374151').text(`${pdfValue(comment.createdAt && new Date(comment.createdAt).toISOString())} - ${pdfValue(comment.text)}`);
        if (comment.imageUrl) document.text(`Attached image: ${comment.imageUrl}`);
        (comment.replies || []).forEach((reply) => {
          document.font('Helvetica-Oblique').fillColor('#4b5563').text(`Reply by ${pdfValue(reply.authorName, reply.author?.name)}: ${pdfValue(reply.text)}`);
        });
        document.moveDown(0.35);
      });
    }

    document.moveDown(0.5).font('Helvetica').fontSize(8).fillColor('#6b7280').text(
      'Generated from PATHPROHORI records for authorized operational and law-enforcement use.',
      { align: 'center' }
    );
    document.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Get all danger feed incidents
// @route   GET /api/incidents
export const getIncidents = async (req, res, next) => {
  try {
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

// @desc    Get high-severity validated incidents for Law Enforcement PDF Export (Admin Only)
// @route   GET /api/incidents/export/high-severity
// @access  Private/Admin
export const getVerifiedHighThreatIncidents = async (req, res, next) => {
  try {
    const { area, severity, limit } = req.query;

    const filter = {};

    // Filter by high severity
    if (severity) {
      filter.severity = severity;
    } else {
      filter.severity = { $in: ['High Alert', 'Critical', 'Emergency'] };
    }

    // Optional area filter
    if (area && area !== 'All Neighborhoods') {
      filter.locationName = { $regex: area, $options: 'i' };
    }

    const incidents = await Incident.find(filter)
      .populate('reportedBy', 'name email phone avatarUrl role')
      .populate('comments.author', 'name avatarUrl role')
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 100);

    res.json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
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
    const {
      title,
      description,
      locationName,
      longitude,
      latitude,
      severity,
      imageUrl,
      durationHours,
      durationSelected,
    } = req.body;

    // Calculate expiration: if 'Don't Know' / unscheduled / invalid, default to 24 hours (1 Day)
    let hours = parseInt(durationHours, 10);
    if (isNaN(hours) || hours <= 0) {
      hours = 24; // Default 1 Day (24 hours)
    }
    if (hours > 168) {
      hours = 168; // Max 1 Week (168 hours)
    }

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

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
      durationSelected: durationSelected || `${hours} Hours`,
      expiresAt,
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

// ===========================vote incident (upvote)==============================
// @desc    Vote on incident (Exclusive Upvote / Downvote)
// @route   POST /api/incidents/:id/vote
// @desc    Vote on incident (Exclusive Upvote / Downvote)
// @route   POST /api/incidents/:id/vote
// @desc    Vote on incident
// @route   POST /api/incidents/:id/vote
// @access  Private
export const voteIncident = async (req, res, next) => {
  try {
    const { voteType } = req.body;
    const incidentId = req.params.id;
    const userId = req.user._id;

    if (!['up', 'down'].includes(voteType)) {
      return res.status(400).json({
        message: 'Invalid vote type. Use "up" or "down".',
      });
    }

    const incident = await Incident.findById(incidentId);

    if (!incident) {
      return res.status(404).json({
        message: 'Incident not found',
      });
    }

    const userIdStr = userId.toString();

    const upvotes = incident.upvotes || [];
    const downvotes = incident.downvotes || [];

    const alreadyUpvoted = upvotes.some(
      (id) => id.toString() === userIdStr
    );

    const alreadyDownvoted = downvotes.some(
      (id) => id.toString() === userIdStr
    );

    let update;

    if (voteType === 'up') {
      if (alreadyUpvoted) {
        update = {
          $pull: {
            upvotes: userId,
          },
        };
      } else {
        // Add upvote and remove downvote
        update = {
          $addToSet: {
            upvotes: userId,
          },
          $pull: {
            downvotes: userId,
          },
        };
      }
    } else {
      if (alreadyDownvoted) {
        update = {
          $pull: {
            downvotes: userId,
          },
        };
      } else {
        update = {
          $addToSet: {
            downvotes: userId,
          },
          $pull: {
            upvotes: userId,
          },
        };
      }
    }

    const updatedIncident = await Incident.findByIdAndUpdate(
      incidentId,
      update,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedIncident) {
      return res.status(404).json({
        message: 'Incident not found',
      });
    }

    const isVerified = updatedIncident.upvotes.length >= 10;

    await Incident.findByIdAndUpdate(incidentId, {
      $set: {
        isVerified,
      },
    });

    const populated = await fetchPopulatedIncident(incidentId);

    return res.json(populated);
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
