import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
  ArrowLeft,
  ThumbsUp,
  MessageSquare,
  Share2,
  Image,
  MapPin,
  Clock,
  Send,
  Users,
  CheckCircle,
} from 'lucide-react';

export const IncidentDiscussion = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [upvotesCount, setUpvotesCount] = useState(0);
  const [upvoted, setUpvoted] = useState(false);

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        const { data } = await API.get(`/incidents/${id || 'seed'}`);
        setIncident(data);
        setUpvotesCount(data.upvotes?.length || 10);
      } catch (err) {
        console.error('Failed to load incident discussion:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIncident();
  }, [id]);

  const handleUpvote = async () => {
    if (!incident) return;
    try {
      const { data } = await API.post(`/incidents/${incident._id}/upvote`);
      setUpvotesCount(data.upvotesCount);
      setUpvoted(data.upvotedByUser);
    } catch (err) {
      console.error('Failed to upvote report:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const { data } = await API.post(`/incidents/${incident._id}/comments`, {
        text: commentText,
      });
      setIncident({ ...incident, comments: data });
      setCommentText('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-[#6B4355]">
        Loading Community Discussion Thread...
      </div>
    );
  }

  const mainIncident = incident || {
    title: 'Street Light Outage & Suspicious Activity',
    description:
      'Reported near Green Valley Park east entrance. Entire block lighting is offline. Multiple users have reported a group of individuals lingering in the shadows near bike racks. Please avoid this path until patrol arrives.',
    locationName: 'Green Valley Park East Entrance',
    severity: 'High Alert',
    comments: [
      {
        authorName: 'Sarah Mitchell',
        authorRole: 'Verified Resident',
        text: 'I just drove past. The street lights are indeed all off from the park entrance down to the 4th street intersection. I saw two police cruisers just arriving at the scene now. Stay safe everyone!',
        likes: 12,
      },
      {
        authorName: 'David Chen',
        authorRole: 'Commuter',
        text: 'Be careful with the potholes near the dark stretch too, very hard to see them without the overhead lights.',
        imageUrl:
          'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
        likes: 6,
      },
      {
        authorName: 'Elena Rodriguez',
        authorRole: 'Local Guardian',
        text: 'Has anyone heard if the utility company has been notified about the lights?',
        likes: 3,
      },
    ],
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        to="/live-danger-feed"
        className="inline-flex items-center gap-2 text-xs font-bold text-[#6B4355] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Incident Details
      </Link>

      {/* Main Top Header Incident Card matching Figma Screen 1 */}
      <div className="bg-white p-8 rounded-3xl border border-[#EFEAEB] shadow-card flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-[#FDE8EC] text-[#D93856] font-extrabold text-[10px] rounded-full uppercase tracking-wider">
              {mainIncident.severity || 'HIGH ALERT'}
            </span>
            <span className="text-xs text-[#8C8289] font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Reported 12 mins ago
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-[#2D2329]">
            {mainIncident.title}
          </h1>

          <p className="text-xs text-[#6E656B] font-medium leading-relaxed">
            {mainIncident.description}
          </p>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-[#6B4355] text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-white">
                  S
                </div>
                <div className="w-6 h-6 rounded-full bg-[#E05370] text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-white">
                  D
                </div>
                <div className="w-6 h-6 rounded-full bg-[#AA7492] text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-white">
                  E
                </div>
              </div>
              <span className="text-xs text-[#8C8289] font-medium">
                42 neighbors are discussing this
              </span>
            </div>

            <button
              onClick={handleUpvote}
              className={`ml-auto px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                upvoted
                  ? 'bg-[#6B4355] text-white'
                  : 'bg-[#FDF7F9] text-[#6B4355] border border-[#F3E6EC] hover:bg-[#F4ECEF]'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              {upvotesCount} Upvotes
            </button>
          </div>
        </div>

        {/* Thumbnail Map Snapshot preview on right */}
        <div className="w-full md:w-48 h-36 rounded-2xl overflow-hidden bg-[#F4F1F3] border border-[#EFEAEB] shrink-0">
          <img
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80"
            alt="Incident Location Map"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Community Discussion Section matching Figma Screen 1 */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-[#2D2329]">
            Community Discussion
          </h3>
          <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-[#EFEAEB] text-xs">
            <button className="px-3 py-1 bg-[#6B4355] text-white font-bold rounded-full">
              Newest
            </button>
            <button className="px-3 py-1 text-[#6E656B] font-semibold hover:text-[#6B4355]">
              Top
            </button>
            <button className="px-3 py-1 text-[#6E656B] font-semibold hover:text-[#6B4355]">
              Verified
            </button>
          </div>
        </div>

        {/* Share Update Post Form */}
        <div className="bg-white p-6 rounded-3xl border border-[#EFEAEB] shadow-card space-y-4">
          <form onSubmit={handleAddComment} className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#6B4355] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share a safety update or ask a question..."
                className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] p-3 rounded-2xl border border-transparent focus:outline-none focus:border-[#6B4355] focus:bg-white resize-none font-medium transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3 text-[#8C8289]">
                <button type="button" className="p-2 hover:bg-[#F9F6F7] rounded-full text-[#6B4355]">
                  <Image className="w-4 h-4" />
                </button>
                <button type="button" className="p-2 hover:bg-[#F9F6F7] rounded-full text-[#6B4355]">
                  <MapPin className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#6B4355] hover:bg-[#5C3A48] text-white text-xs font-bold rounded-full shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                Post Update
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Comment Thread Items */}
        <div className="space-y-4">
          {mainIncident.comments?.map((comment, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-3xl border border-[#EFEAEB] shadow-card space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FDE8EC] text-[#6B4355] font-bold text-xs flex items-center justify-center">
                    {comment.authorName ? comment.authorName.charAt(0) : 'C'}
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-[#2D2329] flex items-center gap-2">
                      {comment.authorName}
                      {comment.authorRole === 'Verified Resident' && (
                        <span className="px-2 py-0.5 bg-[#F3E8FF] text-[#7E22CE] text-[10px] font-bold rounded-full uppercase">
                          VERIFIED RESIDENT
                        </span>
                      )}
                    </h5>
                    <span className="text-[11px] text-[#8C8289] font-medium">
                      5m ago
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#6E656B] font-medium leading-relaxed pl-12">
                {comment.text}
              </p>

              {comment.imageUrl && (
                <div className="pl-12 pt-2">
                  <img
                    src={comment.imageUrl}
                    alt="Comment Preview"
                    className="max-h-48 rounded-2xl object-cover border border-[#EFEAEB]"
                  />
                </div>
              )}

              <div className="flex items-center gap-6 pl-12 pt-2 text-xs font-bold text-[#8C8289]">
                <button className="flex items-center gap-1.5 hover:text-[#6B4355]">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {comment.likes || 12}
                </button>
                <button className="hover:text-[#6B4355]">Reply</button>
                <button className="hover:text-[#6B4355]">Share</button>
              </div>
            </div>
          ))}
        </div>

        {/* Load older comments button */}
        <div className="text-center pt-4">
          <button className="px-6 py-2.5 bg-white text-[#6B4355] border border-[#EFEAEB] hover:bg-[#F9F6F7] text-xs font-bold rounded-full transition-colors">
            Load older comments
          </button>
        </div>
      </div>
    </div>
  );
};
