import React, { useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { ThumbsUp, ThumbsDown, MessageSquare, MapPin, CheckCircle2, Trash2, Edit3, User } from 'lucide-react';

export const IncidentCard = ({ incident, onVote, onEdit, onDelete }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const getBadgeVariant = (severity) => {
    if (severity === 'High Alert') return 'highAlert';
    if (severity === 'Med Severity') return 'medSeverity';
    return 'lowSeverity';
  };

  const userIdStr = user?._id?.toString() || user?.id?.toString() || '';
  const reportedByObj = (incident?.reportedBy && typeof incident.reportedBy === 'object') ? incident.reportedBy : null;
  const reportedByStr = typeof incident.reportedBy === 'string' ? incident.reportedBy : reportedByObj?._id ? reportedByObj._id.toString() : '';

  const isOwner = Boolean(userIdStr && reportedByStr && userIdStr === reportedByStr);
  const isAdminOrOperator = ['admin', 'operator'].includes(user?.role);
  const canManage = isOwner || isAdminOrOperator;

  // Real-time instant avatar & name resolution for incident reporter
  const reporterAvatar = (isOwner ? user?.avatarUrl : null) || reportedByObj?.avatarUrl || '';
  const reporterName = (isOwner ? user?.name : null) || reportedByObj?.name || 'Commuter';

  const upvoteList = Array.isArray(incident.upvotes) ? incident.upvotes : [];
  const downvoteList = Array.isArray(incident.downvotes) ? incident.downvotes : [];

  const isUpvoted = Boolean(
    userIdStr &&
    upvoteList.some((id) => {
      const raw = typeof id === 'string' ? id : id?._id ? id._id.toString() : id ? id.toString() : '';
      return raw === userIdStr;
    })
  );

  const isDownvoted = Boolean(
    userIdStr &&
    downvoteList.some((id) => {
      const raw = typeof id === 'string' ? id : id?._id ? id._id.toString() : id ? id.toString() : '';
      return raw === userIdStr;
    })
  );

  const upvotesCount = upvoteList.length;
  const downvotesCount = downvoteList.length;
  const distanceDisplay = incident.distanceText || (typeof incident.distanceKm === 'number' ? `${incident.distanceKm} km` : '0.8 km');

  const handleCardClick = () => {
    navigate(`/incident/${incident._id}`);
  };

  return (
    <Card
      onClick={handleCardClick}
      className="space-y-4 hover:border-[#6B4355] transition-all cursor-pointer group shadow-xs hover:shadow-card relative"
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-lg text-[#2D2329] group-hover:text-[#6B4355] transition-colors leading-tight">
              {incident.title}
            </h3>
            <Badge variant={getBadgeVariant(incident.severity)}>
              {incident.severity}
            </Badge>
            {incident.upvotes?.length >= 10 && (
              <Badge variant="verified">
                <CheckCircle2 className="w-3 h-3 text-sky-600" />
                Community Verified
              </Badge>
            )}
          </div>

          {/* Location & Author Info Banner */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-[#8C7A87]">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#6B4355]" />
              <span>{incident.locationName} ({distanceDisplay} away)</span>
            </span>

            <span className="text-[#E0D5DC]">•</span>

            <span className="flex items-center gap-1.5 font-extrabold text-[#6B4355] bg-[#F9F8FA] px-2.5 py-1 rounded-full border border-[#E0D5DC] shadow-xs">
              {reporterAvatar ? (
                <img src={reporterAvatar} alt={reporterName} className="w-4 h-4 rounded-full object-cover border border-[#6B4355]/30 shadow-xs" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-[#6B4355] text-white font-black text-[9px] flex items-center justify-center shadow-xs">
                  {reporterName ? reporterName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span>Posted by {reporterName}</span>
            </span>

            {incident.isEdited && (
              <span className="text-[10px] text-gray-400 font-normal italic opacity-70 ml-1">(edited)</span>
            )}
          </div>
        </div>

        {/* Edit & Delete Action Buttons for Author / Admin */}
        {canManage && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(incident);
                }}
                title="Edit report & change/remove photo"
                className="p-2 text-[#6B4355] hover:bg-[#6B4355]/10 rounded-xl transition-all"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Delete this hazard report and its Cloudinary photo asset?')) {
                    onDelete(incident._id);
                  }
                }}
                title="Delete report & Cloudinary photo asset"
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-[#4A3D46] font-medium leading-relaxed">
        {incident.description}
      </p>

      {/* Full Aspect Ratio Image Attachment */}
      {incident.imageUrl && (
        <div className="rounded-2xl overflow-hidden bg-[#F9F8FA] border border-[#E0D5DC] flex items-center justify-center max-h-96 p-1">
          <img
            src={incident.imageUrl}
            alt={incident.title}
            className="w-full max-h-96 object-contain rounded-xl shadow-xs"
          />
        </div>
      )}

      {/* Action Footer Bar with Exclusive Icon-Only Upvote/Downvote Pills */}
      <div className="flex items-center justify-between border-t border-[#F0EBF0] pt-3 text-xs font-bold text-[#6B4355]">
        <div className="inline-flex items-center bg-[#F9F8FA] border border-[#E0D5DC] rounded-2xl p-1 gap-1 shadow-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onVote) onVote(incident._id, 'up');
            }}
            title="Confirm / Upvote Hazard Report"
            className={`p-2 rounded-xl flex items-center gap-1.5 transition-all ${isUpvoted
              ? 'bg-[#6B4355] text-white shadow-sm'
              : 'text-[#6B4355] hover:bg-[#6B4355]/10'
              }`}
          >
            <ThumbsUp className={`w-4 h-4 ${isUpvoted ? 'text-white fill-white' : 'text-[#6B4355]'}`} />
            <span className="text-xs font-extrabold">{upvotesCount}</span>
          </button>

          <div className="w-[1px] h-4 bg-[#E0D5DC]"></div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onVote) onVote(incident._id, 'down');
            }}
            title="Downvote / Dispute Report"
            className={`p-2 rounded-xl flex items-center gap-1.5 transition-all ${isDownvoted
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-[#8C7A87] hover:bg-rose-50 hover:text-rose-600'
              }`}
          >
            <ThumbsDown className={`w-4 h-4 ${isDownvoted ? 'text-white fill-white' : 'text-[#8C7A87]'}`} />
            <span className="text-xs font-extrabold">{downvotesCount}</span>
          </button>
        </div>

        <Link
          to={`/incident/${incident._id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#F9F8FA] hover:bg-[#6B4355] hover:text-white border border-[#E0D5DC] text-[#6B4355] rounded-2xl text-xs font-extrabold transition-all shadow-xs"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Discussion ({incident.comments?.length || 0})</span>
        </Link>
      </div>
    </Card>
  );
};

export default IncidentCard;
