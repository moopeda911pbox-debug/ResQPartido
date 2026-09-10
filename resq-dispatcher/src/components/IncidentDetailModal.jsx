import React from "react";
import { useNavigate } from "react-router-dom";
import { X, MapPin, Navigation, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { STATUS } from "../services/incidents";
import { useAddress } from "../lib/geocode";

export default function IncidentDetailModal({ incident, onClose }) {
  const navigate = useNavigate();
  const hasCoords = incident && incident.latitude != null && incident.longitude != null;
  const address = useAddress(
    hasCoords ? incident.latitude : null,
    hasCoords ? incident.longitude : null,
    incident?.address
  );

  if (!incident) return null;

  const reporterName =
    `${incident.profiles?.first_name ?? ""} ${incident.profiles?.last_name ?? ""}`.trim() || "Unknown reporter";
  const media = incident.incident_media ?? [];
  const photos = media.filter((m) => m.file_type === "photo");
  const videos = media.filter((m) => m.file_type === "video");

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div>
            <h2>{incident.incident_type}</h2>
            <span className={`status-pill ${STATUS[incident.status].className}`}>{STATUS[incident.status].label}</span>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="detail-meta">
          <div>
            <span className="label">Reported by</span>
            <p>{reporterName}{incident.profiles?.municipality ? ` · ${incident.profiles.municipality}` : ""}</p>
          </div>
          <div>
            <span className="label">Submitted</span>
            <p>{new Date(incident.created_at).toLocaleString()}</p>
          </div>
          {hasCoords && (
            <div>
              <span className="label">Location</span>
              <p>
                <MapPin size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                {address || `${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)} (locating address…)`}{" "}
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    navigate(`/?navigateTo=${incident.id}`);
                  }}
                  style={{
                    color: "var(--orange)", fontWeight: 600, background: "none", border: "none",
                    padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                    font: "inherit",
                  }}
                >
                  <Navigation size={12} /> Navigate on map
                </button>
              </p>
            </div>
          )}
        </div>

        <div className="detail-section">
          <span className="label">Description</span>
          <p className="detail-description">{incident.description}</p>
        </div>

        <div className="detail-section">
          <span className="label">
            Photos &amp; Videos {media.length > 0 && `(${media.length})`}
          </span>

          {media.length === 0 ? (
            <p className="empty-state" style={{ padding: "16px 0" }}>
              No photos or videos were attached to this report.
            </p>
          ) : (
            <div className="media-grid">
              {photos.map((m) => (
                <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer" className="media-thumb">
                  <img src={m.file_url} alt="Incident photo" />
                  <span className="media-tag"><ImageIcon size={11} /> Photo</span>
                </a>
              ))}
              {videos.map((m) => (
                <div key={m.id} className="media-thumb media-video">
                  <video src={m.file_url} controls preload="metadata" />
                  <span className="media-tag"><VideoIcon size={11} /> Video</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
