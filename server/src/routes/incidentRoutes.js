import express from 'express';
import { authorize, protect } from '../middleware/authMiddleware.js';
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
} from '../controllers/incidentController.js';

const router = express.Router();

router.get('/', getIncidents);
router.get('/:id/pdf', protect, authorize('admin', 'operator'), exportIncidentPdf);
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
