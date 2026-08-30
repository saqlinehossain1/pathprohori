import React, { useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import incidentApi from '../../api/incidentApi';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  MapPin,
  CheckCircle2,
  Trash2,
  Edit3,
  User,
  Clock,
  FileDown,
} from 'lucide-react';

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

  const userIdStr = user?._id?.toString() || user?.id?.toString() || '';
  const reportedByObj =
    incident?.reportedBy && typeof incident.reportedBy === 'object'
      ? incident.reportedBy
      : null;
  const reportedByStr =
    typeof incident.reportedBy === 'string'
      ? incident.reportedBy
      : reportedByObj?._id
      ? reportedByObj._id.toString()
      : '';

  const isOwner = Boolean(userIdStr && reportedByStr && userIdStr === reportedByStr);
  const isAdminOrOperator = ['admin', 'operator'].includes(user?.role);
  const canManage = isOwner || isAdminOrOperator;

  const handleExportPdf = async (event) => {
    event.stopPropagation();
    try {
      const blob = await incidentApi.exportIncidentPdf(incident._id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pathprohori-incident-${incident._id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export incident PDF:', error);
      window.alert(
        error.response?.data?.message || 'Unable to export this incident report.'
      );
    }
  };

  // Real-time instant avatar & name resolution for incident reporter
  const reporterAvatar = (isOwner ? user?.avatarUrl : null) || reportedByObj?.avatarUrl || '';
  const reporterName = (isOwner ? user?.name : null) || reportedByObj?.name || 'Commuter';

  const upvoteList = Array.isArray(incident.upvotes) ? incident.upvotes : [];
  const downvoteList = Array.isArray(incident.downvotes) ? incident.downvotes : [];

  const isUpvoted = Boolean(
    userIdStr &&
      upvoteList.some((id) => {
        const raw =
          typeof id === 'string' ? id : id?._id ? id._id.toString() : id ? id.toString() : '';
        return raw === userIdStr;
      })
  );

  const isDownvoted = Boolean(
    userIdStr &&
      downvoteList.some((id) => {
        const raw =
          typeof id === 'string' ? id : id?._id ? id._id.toString() : id ? id.toString() : '';
        return raw === userIdStr;
      })
  );

  const upvotesCount = upvoteList.length;
  const downvotesCount = downvoteList.length;
  const distanceDisplay =
    incident.distanceText ||
    (typeof incident.distanceKm === 'number' ? `${incident.distanceKm} km` : '0.8 km');

  const handleCardClick = () => {
    navigate(`/incident/${incident._id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="p-4 sm:p-5 space-y-3.5 hover:border-slate-300/90 transition-all cursor-pointer bg-white border border-slate-200/90 rounded-2xl shadow-soft hover-lift relative"
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 hover:text-rose-600 transition-colors leading-snug font-display">
              {incident.title}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                incident.severity === 'High Alert'
                  ? 'bg-red-50 text-red-700 border-red-200 shadow-2xs'
                  : incident.severity === 'Med Severity'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  incident.severity === 'High Alert'
                    ? 'bg-red-600 animate-ping'
                    : incident.severity === 'Med Severity'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
              {incident.severity}
            </span>

            {(incident.isVerified || incident.upvotes?.length >= 10) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
                <CheckCircle2 className="w-3 h-3 text-sky-600" />
                Verified
              </span>
            )}
            {incident.expiresAt && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100/80 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-slate-400" />
                Purges in {getRemainingTime(incident.expiresAt)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] font-bold overflow-hidden">
                {reporterAvatar ? (
                  <img src={reporterAvatar} alt={reporterName} className="w-full h-full object-cover" />
                ) : (
                  reporterName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-slate-700 font-medium">{reporterName}</span>
            </div>

            <span>•</span>

            <div className="flex items-center gap-1 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{incident.location?.areaName || 'General Dhaka Area'}</span>
              <span className="text-slate-700 font-semibold font-mono">({distanceDisplay})</span>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(incident);
              }}
              title="Edit Hazard"
              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to remove this danger report?')) {
                  onDelete(incident._id);
                }
              }}
              title="Delete Hazard"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {isAdminOrOperator && (
              <button
                type="button"
                onClick={handleExportPdf}
                title="Export Law Enforcement Incident Dossier"
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 font-normal leading-relaxed">
        {incident.description}
      </p>

      {/* Image Attachment */}
      {incident.imageUrl && (
        <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200 max-h-72 sm:max-h-80 flex items-center justify-center p-1">
          <img
            src={incident.imageUrl}
            alt={incident.title}
            className="w-full max-h-72 sm:max-h-80 object-contain rounded-lg"
          />
        </div>
      )}

      {/* Action Footer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-700">
        <div className="inline-flex items-center bg-slate-100/90 border border-slate-200 rounded-xl p-0.5 gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onVote) onVote(incident._id, 'up');
            }}
            title="Confirm / Upvote Hazard Report"
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 ${
              isUpvoted
                ? 'bg-slate-900 text-white font-bold'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ThumbsUp
              className={`w-3.5 h-3.5 ${isUpvoted ? 'text-white fill-white' : 'text-slate-600'}`}
            />
            <span className="text-xs font-semibold">{upvotesCount}</span>
          </button>

          <div className="w-[1px] h-3.5 bg-slate-300"></div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onVote) onVote(incident._id, 'down');
            }}
            title="Downvote / Dispute Report"
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 ${
              isDownvoted
                ? 'bg-red-600 text-white font-bold'
                : 'text-slate-500 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            <ThumbsDown
              className={`w-3.5 h-3.5 ${isDownvoted ? 'text-white fill-white' : 'text-slate-500'}`}
            />
            <span className="text-xs font-semibold">{downvotesCount}</span>
          </button>
        </div>

        <Link
          to={`/incident/${incident._id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all shadow-2xs active:scale-95"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Discussion ({incident.comments?.length || 0})</span>
        </Link>
      </div>
    </div>
  );
};

export default IncidentCard;
