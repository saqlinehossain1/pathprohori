import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import API from '../services/api';
import {
  ShieldAlert,
  MapPin,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import L from 'leaflet';

// Custom Map Pin Icons
const createCustomIcon = (severity) => {
  const color = severity.includes('High')
    ? '#D93856'
    : severity.includes('Med')
    ? '#D97706'
    : '#DB2777';

  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
          </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

export const LiveDangerFeed = () => {
  const [incidents, setIncidents] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Newest First');
  const [showReportModal, setShowReportModal] = useState(false);

  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    locationName: '',
    severity: 'Med Severity',
  });

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const { data } = await API.get('/incidents');
        setIncidents(data);
      } catch (err) {
        console.error('Failed to load incidents:', err);
      }
    };
    fetchIncidents();
  }, []);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/incidents', newIncident);
      setIncidents([data, ...incidents]);
      setShowReportModal(false);
      setNewIncident({
        title: '',
        description: '',
        locationName: '',
        severity: 'Med Severity',
      });
    } catch (err) {
      console.error('Failed to post incident:', err);
    }
  };

  const getSeverityBadgeClass = (severity) => {
    if (severity.includes('High')) {
      return 'bg-[#FDE8EC] text-[#D93856] border-[#F9C5D1]';
    }
    if (severity.includes('Med')) {
      return 'bg-[#FFF3E0] text-[#D97706] border-[#FFE0B2]';
    }
    return 'bg-[#FDF2F8] text-[#DB2777] border-[#FBCFE8]';
  };

  // Center on Dhaka coordinates
  const mapCenter = [23.8103, 90.4125];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-140px)]">
        {/* Left Column: Live Danger Feed List (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Top Card: Live Coverage */}
          <div className="bg-white p-6 rounded-3xl border border-[#EFEAEB] shadow-card flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FDF7F9] text-[#6B4355] flex items-center justify-center font-bold">
                <MapPin className="w-6 h-6 text-[#6B4355]" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8C8289]">
                  ● LIVE COVERAGE
                </span>
                <h3 className="text-xl font-extrabold text-[#2D2329]">
                  Dhaka Metropolitan Area
                </h3>
                <p className="text-xs text-[#8C8289] font-medium mt-0.5">
                  Showing hazards & incidents within 15km of your current position.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowReportModal(true)}
              className="px-5 py-3 bg-[#6B4355] hover:bg-[#5C3A48] text-white font-bold text-xs rounded-2xl shadow-md transition-all shrink-0 flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Report Incident
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button className="px-4 py-2 bg-white text-[#6E656B] text-xs font-bold rounded-full border border-[#EFEAEB] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>

            {['Newest First', 'Nearest', 'High Severity'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                  activeFilter === filter
                    ? 'bg-[#FDE8EC] text-[#6B4355] border border-[#F9C5D1]'
                    : 'bg-white text-[#6E656B] border border-[#EFEAEB] hover:bg-[#F9F6F7]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Incidents Feed List */}
          <div className="space-y-4">
            {incidents.map((item) => (
              <div
                key={item._id}
                className="bg-white p-6 rounded-3xl border border-[#EFEAEB] shadow-card hover:shadow-lg transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FDE8EC] text-[#E05370] flex items-center justify-center font-bold shrink-0">
                      <ShieldAlert className="w-5 h-5 text-[#E05370]" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-[#2D2329]">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-[#8C8289] font-medium mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {item.distanceKm || 1.2}km
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          12 mins ago
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 text-[11px] font-extrabold rounded-full border ${getSeverityBadgeClass(
                      item.severity
                    )}`}
                  >
                    {item.severity}
                  </span>
                </div>

                <p className="text-xs text-[#6E656B] font-medium leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-[#F4EFF2] text-xs">
                  {item.isVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F3E8FF] text-[#7E22CE] font-bold rounded-full text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Community Verified
                    </span>
                  ) : (
                    <span className="text-[#8C8289] text-[11px] font-semibold">
                      Unverified Report
                    </span>
                  )}

                  <Link
                    to={`/incident/${item._id}`}
                    className="font-bold text-[#6B4355] hover:underline flex items-center gap-1 text-xs"
                  >
                    View Details
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Leaflet Interactive Map Split View (5 cols) */}
        <div className="lg:col-span-5 h-[650px] lg:h-auto bg-white rounded-3xl border border-[#EFEAEB] shadow-card overflow-hidden relative flex flex-col">
          <MapContainer
            center={mapCenter}
            zoom={13}
            scrollWheelZoom={false}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {incidents.map((item) => (
              <Marker
                key={item._id}
                position={[
                  item.location?.coordinates?.[1] || 23.8103,
                  item.location?.coordinates?.[0] || 90.4125,
                ]}
                icon={createCustomIcon(item.severity)}
              >
                <Popup>
                  <div className="p-1 space-y-1">
                    <h5 className="font-extrabold text-xs text-[#2D2329]">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-[#6E656B]">
                      {item.locationName}
                    </p>
                    <span className="inline-block text-[10px] font-bold text-[#6B4355]">
                      {item.severity}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Bottom Overlay Legend matching Figma Screen 3 */}
          <div className="absolute bottom-4 left-4 right-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-[#EFEAEB] shadow-lg flex items-center justify-between">
            <div>
              <h5 className="text-xs font-extrabold text-[#2D2329]">
                Severity Legend
              </h5>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D93856]"></span>
                High
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
                Medium
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DB2777]"></span>
                Low
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Reporting New Incident */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-[#2D2329]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-[#EFEAEB] shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold text-[#2D2329]">
              Report Community Hazard / Crime
            </h3>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#8C8289] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newIncident.title}
                  onChange={(e) =>
                    setNewIncident({ ...newIncident, title: e.target.value })
                  }
                  placeholder="e.g. Broken Street Light & Lingering Group"
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-2.5 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8C8289] mb-1">
                  Location Name
                </label>
                <input
                  type="text"
                  required
                  value={newIncident.locationName}
                  onChange={(e) =>
                    setNewIncident({
                      ...newIncident,
                      locationName: e.target.value,
                    })
                  }
                  placeholder="e.g. Mohakhali Bus Stand"
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-2.5 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8C8289] mb-1">
                  Severity Level
                </label>
                <select
                  value={newIncident.severity}
                  onChange={(e) =>
                    setNewIncident({
                      ...newIncident,
                      severity: e.target.value,
                    })
                  }
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-2.5 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355]"
                >
                  <option value="High Alert">High Alert</option>
                  <option value="High Severity">High Severity</option>
                  <option value="Med Severity">Med Severity</option>
                  <option value="Low Severity">Low Severity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8C8289] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={newIncident.description}
                  onChange={(e) =>
                    setNewIncident({
                      ...newIncident,
                      description: e.target.value,
                    })
                  }
                  placeholder="Provide clear details to help commuters..."
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-2.5 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-[#6E656B] hover:bg-[#F9F6F7] rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#6B4355] hover:bg-[#5C3A48] text-white text-xs font-bold rounded-full shadow-md"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
