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
      <Card className="text-center py-12">
        <p className="text-sm font-bold text-[#6B4355]">Incident not found.</p>
        <Link to="/live-danger-feed" className="text-xs text-[#6B4355] underline mt-2 block">
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button & Author Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          to="/live-danger-feed"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-[#6B4355] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Live Danger Feed
        </Link>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F9F8FA] hover:bg-[#6B4355] hover:text-white border border-[#E0D5DC] text-[#6B4355] rounded-2xl text-xs font-extrabold transition-all shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Incident Report</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteIncident}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl text-xs font-extrabold transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Incident Report</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Incident Overview Hero Card */}
      <Card className="space-y-4 border-[#E0D5DC]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-[#2D2329]">{incident.title}</h1>
              <Badge variant={incident.severity === 'High Alert' ? 'highAlert' : 'medSeverity'}>
                {incident.severity}
              </Badge>
              {incident.isVerified && (
                <Badge variant="verified">
                  <CheckCircle2 className="w-3 h-3 text-sky-600" />
                  Community Verified
                </Badge>
              )}
            </div>

            {/* Real GPS Live Distance & Author Info Banner */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <p className="text-xs font-extrabold text-[#6B4355] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#6B4355]" />
                {incident.locationName}
              </p>
              <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-extrabold flex items-center gap-1.5 shadow-xs">
                <Navigation className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                {realDistanceText} away from your live GPS position
              </span>

              <span className="flex items-center gap-2 font-extrabold text-[#6B4355] bg-[#F9F8FA] px-3 py-1 rounded-full border border-[#E0D5DC] text-[11px] shadow-xs">
                {reporterAvatar ? (
                  <img src={reporterAvatar} alt={reporterName} className="w-5 h-5 rounded-full object-cover border border-[#6B4355]/30 shadow-xs" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#6B4355] text-white font-black text-[10px] flex items-center justify-center shadow-xs">
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

          {/* Icon-Only Exclusive Upvote / Downvote Pills */}
          <div className="inline-flex items-center bg-[#F9F8FA] border border-[#E0D5DC] rounded-2xl p-1 gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => handleVoteIncident('up')}
              title="Confirm / Upvote"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-extrabold transition-all ${
                isUpvoted ? 'bg-[#6B4355] text-white shadow-xs' : 'text-[#6B4355] hover:bg-[#6B4355]/10'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${isUpvoted ? 'fill-white' : ''}`} />
              <span>{upvoteList.length}</span>
            </button>

            <div className="w-[1px] h-4 bg-[#E0D5DC]"></div>

            <button
              type="button"
              onClick={() => handleVoteIncident('down')}
              title="Downvote / Dispute"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-extrabold transition-all ${
                isDownvoted ? 'bg-rose-600 text-white shadow-xs' : 'text-[#8C7A87] hover:bg-rose-50 hover:text-rose-600'
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
        <h3 className="text-lg font-extrabold text-[#2D2329] flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#6B4355]" />
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
