import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
  voteIncident,
  addComment,
  updateComment,
  deleteComment,
  voteComment,
  addCommentReply,
  updateCommentReply,
  deleteCommentReply,
  exportIncidentPdf,
  getVerifiedHighThreatIncidents,
} from '../controllers/incidentController.js';

const router = express.Router();
const adminOnly = authorize('admin', 'operator');

router.get('/', getIncidents);
router.get('/export/high-severity', protect, adminOnly, getVerifiedHighThreatIncidents);
router.get('/:id/pdf', protect, adminOnly, exportIncidentPdf);
router.get('/:id', getIncidentById);
router.post('/', protect, createIncident);
router.put('/:id', protect, updateIncident);
router.delete('/:id', protect, deleteIncident);
router.post('/:id/vote', protect, voteIncident);
router.post('/:id/upvote', protect, voteIncident);
router.post('/:id/comments', protect, addComment);
router.put('/:id/comments/:commentId', protect, updateComment);
router.delete('/:id/comments/:commentId', protect, deleteComment);
router.post('/:id/comments/:commentId/vote', protect, voteComment);
router.post('/:id/comments/:commentId/reply', protect, addCommentReply);
router.put('/:id/comments/:commentId/replies/:replyId', protect, updateCommentReply);
router.delete('/:id/comments/:commentId/replies/:replyId', protect, deleteCommentReply);

export default router;
