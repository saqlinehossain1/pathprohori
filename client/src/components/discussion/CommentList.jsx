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
      <div className="text-center py-8 bg-[#F9F8FA] rounded-2xl border border-dashed border-[#E0D5DC]">
        <MessageSquare className="w-8 h-8 text-[#8C7A87] mx-auto mb-2 opacity-50" />
        <p className="text-xs font-bold text-[#8C7A87]">No comments yet on this discussion thread.</p>
        <p className="text-[11px] text-[#9A8B95] mt-0.5">Be the first to share an update or eyewitness report!</p>
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
