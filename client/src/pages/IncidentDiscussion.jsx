import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import incidentApi from '../api/incidentApi';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CommentList from '../components/discussion/CommentList';
import NewCommentForm from '../components/discussion/NewCommentForm';
import EditIncidentModal from '../components/incidents/EditIncidentModal';
import { ArrowLeft, MapPin, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle2, Navigation, Trash2, Edit3, User } from 'lucide-react';

export const IncidentDiscussion = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 23.8103, lng: 90.4125 });

  // Get live phone GPS position for real-time distance calculation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.warn('[GPS Geolocation] Defaulting to Dhaka center:', err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const data = await incidentApi.getIncidentById(id);
      setIncident(data);
    } catch (err) {
      console.error('Failed to load incident thread:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchIncident();
  }, [id]);

  const handleVoteIncident = async (voteType) => {
    if (!incident) return;
    try {
      const updated = await incidentApi.voteIncident(incident._id, voteType);
      setIncident(updated);
    } catch (err) {
      console.error('Failed to vote on report:', err);
    }
  };

  const handleUpdateIncident = async (incidentId, updateData) => {
    try {
      const updated = await incidentApi.updateIncident(incidentId, updateData);
      setIncident(updated);
    } catch (err) {
      console.error('Failed to edit incident:', err);
    }
  };

  const handleDeleteIncident = async () => {
    if (!incident) return;
    if (window.confirm('Delete this hazard report and its Cloudinary photo asset?')) {
      try {
        await incidentApi.deleteIncident(incident._id);
        navigate('/live-danger-feed');
      } catch (err) {
        console.error('Failed to delete incident:', err);
      }
    }
  };

  const handleAddComment = async (commentData) => {
    if (!incident) return;
    try {
      setSubmittingComment(true);
      const updatedIncident = await incidentApi.addComment(incident._id, commentData);
      setIncident(updatedIncident);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateComment = async (commentId, commentData) => {
    if (!incident) return;
    try {
      const updatedIncident = await incidentApi.updateComment(incident._id, commentId, commentData);
      setIncident(updatedIncident);
    } catch (err) {
      console.error('Failed to edit comment:', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!incident) return;
    try {
      const updatedIncident = await incidentApi.deleteComment(incident._id, commentId);
      setIncident(updatedIncident);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleVoteComment = async (commentId, voteType) => {
    if (!incident) return;
    try {
      const updatedIncident = await incidentApi.voteComment(incident._id, commentId, voteType);
      setIncident(updatedIncident);
    } catch (err) {
      console.error('Failed to vote comment:', err);
    }
  };

  const handleReplyComment = async (commentId, text) => {
    if (!incident) return;
    try {
      const updatedIncident = await incidentApi.addCommentReply(incident._id, commentId, text);
      setIncident(updatedIncident);
    } catch (err) {
      console.error('Failed to reply to comment:', err);
    }
  };

  const handleUpdateReply = async (commentId, replyId, text) => {
    if (!incident) return;
    try {
      const updatedIncident = await incidentApi.updateCommentReply(incident._id, commentId, replyId, text);
      setIncident(updatedIncident);
    } catch (err) {
      console.error('Failed to edit reply:', err);
    }
  };

  const handleDeleteReply = async (commentId, replyId) => {
    if (!incident) return;
    try {
      const updatedIncident = await incidentApi.deleteCommentReply(incident._id, commentId, replyId);
      setIncident(updatedIncident);
    } catch (err) {
      console.error('Failed to delete reply:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading Discussion Thread..." />;
  }

  if (!incident) {
    return (
      <Card className="text-center py-12 border-slate-200/80 shadow-card">
        <p className="text-sm font-extrabold text-slate-900 font-display">Incident not found.</p>
        <Link to="/live-danger-feed" className="text-xs text-rose-600 font-extrabold hover:underline mt-2 block font-display">
          Return to Danger Feed
        </Link>
      </Card>
    );
  }

  // Calculate live dynamic distance from user GPS to incident coordinates
  const calculateLiveDistanceText = () => {
    const coords = incident.location?.coordinates;
    if (!coords || coords.length < 2 || !userLocation.lat || !userLocation.lng) return '0.8 km';
    const incLng = coords[0];
    const incLat = coords[1];

    const R = 6371; // Radius of earth in km
    const dLat = ((incLat - userLocation.lat) * Math.PI) / 180;
    const dLon = ((incLng - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((incLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return dist < 1 ? `${Math.round(dist * 1000)} m` : `${(Math.round(dist * 10) / 10).toFixed(1)} km`;
  };

  const userIdStr = user?._id?.toString() || user?.id?.toString() || '';
  const reportedByObj = (incident.reportedBy && typeof incident.reportedBy === 'object') ? incident.reportedBy : null;
  const reportedByStr = typeof incident.reportedBy === 'string' ? incident.reportedBy : reportedByObj?._id ? reportedByObj._id.toString() : '';

  const isOwner = Boolean(userIdStr && reportedByStr && userIdStr === reportedByStr);
  const isAdminOrOperator = ['admin', 'operator'].includes(user?.role);
  const canManage = isOwner || isAdminOrOperator;

  // Real-time instant avatar & name resolution for incident reporter
  const reporterAvatar = (isOwner ? user?.avatarUrl : null) || reportedByObj?.avatarUrl || '';
  const reporterName = (isOwner ? user?.name : null) || reportedByObj?.name || 'Commuter';

  const upvoteList = Array.isArray(incident.upvotes) ? incident.upvotes : [];
  const downvoteList = Array.isArray(incident.downvotes) ? incident.downvotes : [];

  const isUpvoted = upvoteList.some((uId) => (typeof uId === 'string' ? uId : uId._id || uId) === userIdStr);
  const isDownvoted = downvoteList.some((uId) => (typeof uId === 'string' ? uId : uId._id || uId) === userIdStr);

  const realDistanceText = calculateLiveDistanceText();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Clean Text Page Header matching other pages */}
      <div className="mobile-page-header">
        <div className="page-header-kicker inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-extrabold mb-2 border border-rose-200 shadow-2xs">
          <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
          <span className="font-display">Community Safety Discussion</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
              Incident Thread & Reports
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              Collaborative community hazard verification and real-time commuter discussion.
            </p>
          </div>

          <Link
            to="/live-danger-feed"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md shadow-slate-950/10 cursor-pointer font-display shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-rose-400" />
            <span>Back to Live Feed</span>
          </Link>
        </div>
      </div>

      {/* Author Actions Bar */}
      {canManage && (
        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold transition-all shadow-xs cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Incident Report</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteIncident}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-2xl text-xs font-extrabold transition-all border border-rose-200 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Report</span>
          </button>
        </div>
      )}

      {/* Main Incident Overview Hero Card */}
      <Card className="space-y-4 border-slate-200/80 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 font-display">{incident.title}</h1>
              <Badge variant={incident.severity === 'High Alert' ? 'highAlert' : 'medSeverity'}>
                {incident.severity}
              </Badge>
              {(incident.isVerified || incident.upvotes?.length >= 10) && (
                <Badge variant="verified">
                  <CheckCircle2 className="w-3 h-3 text-sky-600" />
                  Community Verified
                </Badge>
              )}
            </div>

            {/* Real GPS Live Distance & Author Info Banner */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 font-display">
                <MapPin className="w-4 h-4 text-rose-600" />
                {incident.locationName}
              </p>
              <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-extrabold flex items-center gap-1.5 shadow-xs">
                <Navigation className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                {realDistanceText} away from your live GPS position
              </span>

              <span className="flex items-center gap-2 font-extrabold text-slate-800 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 text-[11px] shadow-xs font-display">
                {reporterAvatar ? (
                  <img src={reporterAvatar} alt={reporterName} className="w-5 h-5 rounded-full object-cover border border-slate-300 shadow-xs" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
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

          {/* Icon-Only Exclusive Upvote / Downvote Pills */}
          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => handleVoteIncident('up')}
              title="Confirm / Upvote"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                isUpvoted ? 'bg-slate-900 text-white shadow-xs ring-2 ring-rose-500/30' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${isUpvoted ? 'fill-white' : ''}`} />
              <span>{upvoteList.length}</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-200"></div>

            <button
              type="button"
              onClick={() => handleVoteIncident('down')}
              title="Downvote / Dispute"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                isDownvoted ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              <ThumbsDown className={`w-4 h-4 ${isDownvoted ? 'fill-white' : ''}`} />
              <span>{downvoteList.length}</span>
            </button>
          </div>
        </div>

        <p className="text-sm text-[#4A3D46] font-medium leading-relaxed">
          {incident.description}
        </p>

        {/* Full Image Display without Crop */}
        {incident.imageUrl && (
          <div className="rounded-3xl overflow-hidden bg-[#F9F8FA] border border-[#E0D5DC] flex items-center justify-center max-h-96 p-1">
            <img src={incident.imageUrl} alt={incident.title} className="w-full max-h-96 object-contain rounded-2xl" />
          </div>
        )}
      </Card>

      {/* Community Comments Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 font-display">
          <MessageSquare className="w-5 h-5 text-rose-600" />
          Community Discussion ({incident.comments?.length || 0})
        </h3>

        <NewCommentForm onSubmit={handleAddComment} loading={submittingComment} />

        <CommentList
          comments={incident.comments}
          incidentId={incident._id}
          onVoteComment={handleVoteComment}
          onReplyComment={handleReplyComment}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
          onUpdateReply={handleUpdateReply}
          onDeleteReply={handleDeleteReply}
        />
      </div>

      {/* Edit Incident Modal */}
      <EditIncidentModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateIncident}
        incident={incident}
      />
    </div>
  );
};

export default IncidentDiscussion;
