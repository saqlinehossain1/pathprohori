import React from 'react';
import CommentItem from './CommentItem';
import { MessageSquare } from 'lucide-react';

export const CommentList = ({
  comments = [],
  incidentId,
  onVoteComment,
  onReplyComment,
  onUpdateComment,
  onDeleteComment,
  onUpdateReply,
  onDeleteReply,
}) => {
  if (comments.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 shadow-xs">
        <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
        <p className="text-xs font-bold text-slate-800 font-display">No comments yet on this discussion thread.</p>
        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Be the first to share an update or eyewitness report!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <CommentItem
          key={c._id || c.createdAt}
          comment={c}
          incidentId={incidentId}
          onVoteComment={onVoteComment}
          onReplyComment={onReplyComment}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
          onUpdateReply={onUpdateReply}
          onDeleteReply={onDeleteReply}
        />
      ))}
    </div>
  );
};

export default CommentList;
