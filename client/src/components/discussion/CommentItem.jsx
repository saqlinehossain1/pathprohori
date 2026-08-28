import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import uploadApi from '../../api/uploadApi';
import { User, ThumbsUp, ThumbsDown, MessageSquare, CornerDownRight, Send, Trash2, Edit2, Check, X, Upload } from 'lucide-react';

export const CommentItem = ({
  comment,
  incidentId,
  onVoteComment,
  onReplyComment,
  onUpdateComment,
  onDeleteComment,
  onUpdateReply,
  onDeleteReply,
}) => {
  const { user } = useContext(AuthContext);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Edit comment state
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [editCommentText, setEditCommentText] = useState(comment.text || '');
  const [editCommentImageUrl, setEditCommentImageUrl] = useState(comment.imageUrl || '');
  const [uploadingEditCommentImage, setUploadingEditCommentImage] = useState(false);

  // Edit reply state
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyText, setEditReplyText] = useState('');

  const userIdStr = user?._id?.toString() || user?.id?.toString() || '';

  const commentAuthorObj = (comment?.author && typeof comment.author === 'object') ? comment.author : null;
  const commentAuthorStr = typeof comment.author === 'string' ? comment.author : commentAuthorObj?._id ? commentAuthorObj._id.toString() : comment.author ? comment.author.toString() : '';
  const isCommentAuthor = Boolean(userIdStr && commentAuthorStr && userIdStr === commentAuthorStr);
  const isAdminOrOperator = ['admin', 'operator'].includes(user?.role);
  const canManageComment = isCommentAuthor || isAdminOrOperator;

  // Real-time dynamic avatar & name resolution
  const commentAvatar = commentAuthorObj?.avatarUrl || comment.authorAvatar || (isCommentAuthor ? user?.avatarUrl : '');
  const commentAuthorName = commentAuthorObj?.name || comment.authorName || (isCommentAuthor ? user?.name : 'Commuter');
  const commentAuthorRole = commentAuthorObj?.role ? (commentAuthorObj.role === 'guardian' ? 'Verified Guardian' : 'Commuter') : comment.authorRole || 'Community Member';

  const likesList = Array.isArray(comment.likes) ? comment.likes : [];
  const dislikesList = Array.isArray(comment.dislikes) ? comment.dislikes : [];

  const isLiked = Boolean(
    userIdStr &&
      likesList.some((id) => {
        const raw = typeof id === 'string' ? id : id?._id ? id._id.toString() : id ? id.toString() : '';
        return raw === userIdStr;
      })
  );

  const isDisliked = Boolean(
    userIdStr &&
      dislikesList.some((id) => {
        const raw = typeof id === 'string' ? id : id?._id ? id._id.toString() : id ? id.toString() : '';
        return raw === userIdStr;
      })
  );

  const likesCount = likesList.length;
  const dislikesCount = dislikesList.length;

  const handleCommentEditPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingEditCommentImage(true);
      const url = await uploadApi.uploadImage(file);
      setEditCommentImageUrl(url);
    } catch (err) {
      console.error('Comment photo upload failed:', err);
      alert('Photo upload failed: ' + err);
    } finally {
      setUploadingEditCommentImage(false);
    }
  };

  const handleSaveCommentEdit = async () => {
    if (!editCommentText.trim() || !onUpdateComment) return;
    try {
      await onUpdateComment(comment._id, {
        text: editCommentText,
        imageUrl: editCommentImageUrl,
      });
      setIsEditingComment(false);
    } catch (err) {
      console.error('Failed to update comment:', err);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !onReplyComment) return;
    try {
      setSubmittingReply(true);
      await onReplyComment(comment._id, replyText);
      setReplyText('');
      setShowReplyForm(false);
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleSaveReplyEdit = async (replyId) => {
    if (!editReplyText.trim() || !onUpdateReply) return;
    try {
      await onUpdateReply(comment._id, replyId, editReplyText);
      setEditingReplyId(null);
    } catch (err) {
      console.error('Failed to update reply:', err);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-4 space-y-3 shadow-card relative">
      {/* Author Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {commentAvatar ? (
            <img
              src={commentAvatar}
              alt={commentAuthorName}
              className="w-9 h-9 rounded-full object-cover border border-slate-800 shadow-xs"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-xs font-display">
              {commentAuthorName ? commentAuthorName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}

          <div>
            <span className="text-xs font-extrabold text-slate-900 block leading-tight font-display">
              {commentAuthorName}
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              {commentAuthorRole}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400">
            {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
            {comment.isEdited && (
              <span className="text-[10px] text-slate-400 font-normal italic opacity-70 ml-1.5">(edited)</span>
            )}
          </span>

          {canManageComment && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditCommentText(comment.text);
                  setEditCommentImageUrl(comment.imageUrl || '');
                  setIsEditingComment(!isEditingComment);
                }}
                title="Edit comment"
                className="p-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete this comment and its attached Cloudinary photo?')) {
                    if (onDeleteComment) onDeleteComment(comment._id);
                  }
                }}
                title="Delete comment & Cloudinary photo"
                className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comment Body Text or Edit Input */}
      {isEditingComment ? (
        <div className="space-y-3 pt-1">
          <textarea
            rows="2"
            value={editCommentText}
            onChange={(e) => setEditCommentText(e.target.value)}
            className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />

          {/* Attached Image Edit & Remove Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingEditCommentImage ? 'Uploading...' : 'Photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCommentEditPhotoUpload}
                disabled={uploadingEditCommentImage}
                className="hidden"
              />
            </label>

            {editCommentImageUrl && (
              <button
                type="button"
                onClick={async () => {
                  if (editCommentImageUrl) {
                    await uploadApi.deleteImage(editCommentImageUrl);
                  }
                  setEditCommentImageUrl('');
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          {editCommentImageUrl && (
            <div className="rounded-xl overflow-hidden max-h-48 border border-slate-200 p-1 bg-slate-50">
              <img src={editCommentImageUrl} alt="Comment proof edit" className="w-full max-h-48 object-contain rounded-lg" />
            </div>
          )}

          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setIsEditingComment(false)}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCommentEdit}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
            >
              Save Edit
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {comment.text}
          </p>

          {/* Comment Full Image Attachment */}
          {comment.imageUrl && (
            <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 max-h-80 p-1 flex items-center justify-center">
              <img src={comment.imageUrl} alt="Comment proof" className="w-full max-h-80 object-contain rounded-xl" />
            </div>
          )}
        </>
      )}

      {/* Comment Actions: Icon-only Like / Dislike + Reply Trigger */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
        <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5 gap-1 shadow-xs">
          <button
            type="button"
            onClick={() => onVoteComment && onVoteComment(comment._id, 'like')}
            title="Like comment"
            className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
              isLiked ? 'bg-slate-900 text-white shadow-xs ring-2 ring-rose-500/30' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`} />
            <span className="text-[11px] font-extrabold">{likesCount}</span>
          </button>

          <div className="w-[1px] h-3 bg-slate-200"></div>

          <button
            type="button"
            onClick={() => onVoteComment && onVoteComment(comment._id, 'dislike')}
            title="Dislike comment"
            className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
              isDisliked ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
            }`}
          >
            <ThumbsDown className={`w-3.5 h-3.5 ${isDisliked ? 'fill-white' : ''}`} />
            <span className="text-[11px] font-extrabold">{dislikesCount}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="text-xs font-bold text-slate-800 flex items-center gap-1 hover:underline px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer font-display"
        >
          <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
          <span>Reply ({comment.replies?.length || 0})</span>
        </button>
      </div>

      {/* Inline Reply Form */}
      {showReplyForm && (
        <form onSubmit={handleReplySubmit} className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
          <input
            type="text"
            placeholder="Write a reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            required
          />
          <button
            type="submit"
            disabled={submittingReply}
            className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>Reply</span>
          </button>
        </form>
      )}

      {/* Nested Replies List */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-4 border-l-2 border-slate-200 space-y-2 mt-3 pt-1">
          {comment.replies.map((reply, rIdx) => {
            const replyAuthorObj = (reply?.author && typeof reply.author === 'object') ? reply.author : null;
            const replyAuthorStr = typeof reply.author === 'string' ? reply.author : replyAuthorObj?._id ? replyAuthorObj._id.toString() : reply.author ? reply.author.toString() : '';
            const isReplyAuthor = Boolean(userIdStr && replyAuthorStr && userIdStr === replyAuthorStr);
            const canManageReply = isReplyAuthor || isAdminOrOperator;
            const isEditingThisReply = editingReplyId === reply._id;

            // Dynamic Real-Time Avatar & Name resolution for replies
            const replyAvatar = replyAuthorObj?.avatarUrl || reply.authorAvatar || (isReplyAuthor ? user?.avatarUrl : '');
            const replyAuthorName = replyAuthorObj?.name || reply.authorName || (isReplyAuthor ? user?.name : 'Commuter');

            return (
              <div key={reply._id || rIdx} className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CornerDownRight className="w-3 h-3 text-rose-600" />
                    {replyAvatar ? (
                      <img src={replyAvatar} alt={replyAuthorName} className="w-5 h-5 rounded-full object-cover border border-slate-300 shadow-xs" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shadow-xs font-display">
                        {replyAuthorName ? replyAuthorName.charAt(0).toUpperCase() : 'R'}
                      </div>
                    )}
                    <span className="font-extrabold text-slate-900 text-[11px] font-display">{replyAuthorName}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-400">
                      {reply.createdAt ? new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      {reply.isEdited && (
                        <span className="text-[9px] text-slate-400 font-normal italic opacity-70 ml-1">(edited)</span>
                      )}
                    </span>

                    {canManageReply && (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditReplyText(reply.text);
                            setEditingReplyId(isEditingThisReply ? null : reply._id);
                          }}
                          title="Edit reply"
                          className="p-0.5 text-slate-600 hover:bg-white rounded transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this reply?')) {
                              if (onDeleteReply) onDeleteReply(comment._id, reply._id);
                            }
                          }}
                          title="Delete reply"
                          className="p-0.5 text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isEditingThisReply ? (
                  <div className="flex items-center gap-1.5 pt-1 pl-5">
                    <input
                      type="text"
                      value={editReplyText}
                      onChange={(e) => setEditReplyText(e.target.value)}
                      className="flex-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveReplyEdit(reply._id)}
                      className="p-1 bg-slate-900 text-white rounded cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-slate-600 font-medium text-[11px] pl-5">{reply.text}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
