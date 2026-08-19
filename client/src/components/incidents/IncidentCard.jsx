import React, { useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { ThumbsUp, ThumbsDown, MessageSquare, MapPin, CheckCircle2, Trash2, Edit3, User, Clock } from 'lucide-react';

export const IncidentCard = ({ incident, onVote, onEdit, onDelete }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const getRemainingTime = (expiresAt) => {
    if (!expiresAt) return '24 hrs';
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';
    const diffMins = Math.round(diffMs / (1000 * 60));
    if (diffMins < 60) return `${diffMins} mins`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hrs`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} days`;
  };

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
      className="p-3.5 sm:p-5 space-y-3 sm:space-y-4 hover:border-slate-300 transition-all cursor-pointer group shadow-card hover:shadow-glass relative border-slate-200/80"
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h3 className="font-black text-base sm:text-lg text-slate-900 group-hover:text-rose-600 transition-colors leading-tight font-display">
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
            {incident.expiresAt && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 font-display">
                <Clock className="w-3 h-3 text-amber-600" />
                Purges in {getRemainingTime(incident.expiresAt)}
              </span>
            )}
          </div>

          {/* Location & Author Info Banner */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{incident.locationName} ({distanceDisplay} away)</span>
            </span>

            <span className="text-slate-300 hidden sm:inline">•</span>

            <span className="flex items-center gap-1.5 font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-slate-200 shadow-xs font-display">
              {reporterAvatar ? (
                <img src={reporterAvatar} alt={reporterName} className="w-4 h-4 rounded-full object-cover border border-slate-300 shadow-xs" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-slate-900 text-white font-black text-[9px] flex items-center justify-center shadow-xs">
                  {reporterName ? reporterName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span>Posted by {reporterName}</span>
            </span>

            {incident.isEdited && (
              <span className="text-[10px] text-slate-400 font-normal italic opacity-70 ml-1">(edited)</span>
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
                className="p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                className="p-1.5 sm:p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 font-medium leading-relaxed">
        {incident.description}
      </p>

      {/* Full Aspect Ratio Image Attachment */}
      {incident.imageUrl && (
        <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center max-h-72 sm:max-h-96 p-1">
          <img
            src={incident.imageUrl}
            alt={incident.title}
            className="w-full max-h-72 sm:max-h-96 object-contain rounded-xl shadow-xs"
          />
        </div>
      )}

      {/* Action Footer Bar with Exclusive Icon-Only Upvote/Downvote Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 sm:pt-3 text-xs font-bold text-slate-700">
        <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 gap-1 shadow-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onVote) onVote(incident._id, 'up');
            }}
            title="Confirm / Upvote Hazard Report"
            className={`p-1.5 sm:p-2 rounded-xl flex items-center gap-1.5 transition-all ${isUpvoted
              ? 'bg-slate-900 text-white shadow-sm ring-2 ring-rose-500/30'
              : 'text-slate-700 hover:bg-slate-200'
              }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isUpvoted ? 'text-white fill-white' : 'text-slate-700'}`} />
            <span className="text-xs font-extrabold">{upvotesCount}</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-200"></div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onVote) onVote(incident._id, 'down');
            }}
            title="Downvote / Dispute Report"
            className={`p-1.5 sm:p-2 rounded-xl flex items-center gap-1.5 transition-all ${isDownvoted
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
              }`}
          >
            <ThumbsDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isDownvoted ? 'text-white fill-white' : 'text-slate-500'}`} />
            <span className="text-xs font-extrabold">{downvotesCount}</span>
          </button>
        </div>

        <Link
          to={`/incident/${incident._id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-800 rounded-2xl text-xs font-extrabold transition-all shadow-xs"
        >
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Discussion ({incident.comments?.length || 0})</span>
        </Link>
      </div>
    </Card>
  );
};

export default IncidentCard;
