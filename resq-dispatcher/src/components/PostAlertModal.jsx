import React, { useState } from "react";
import { X, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { ALERT_TYPES, MUNICIPALITIES, THREAT_LEVELS } from "../lib/alertTypes";
import { postAlert } from "../services/broadcastAlerts";
import { useAuth } from "../context/AuthContext";

export default function PostAlertModal({ onClose, onPosted }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [alertType, setAlertType] = useState("");
  const [threatLevel, setThreatLevel] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [address, setAddress] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = title.trim() && description.trim() && alertType && threatLevel && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await postAlert(user.id, {
        title: title.trim(),
        description: description.trim(),
        alertType,
        threatLevel,
        municipality,
        address: address.trim(),
        photoFile,
        videoFile,
      });
      onPosted?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Couldn't post the alert. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div>
            <h2>Post Emergency Alert</h2>
            <span className="sub">Citizens in the app will see this instantly.</span>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Title *</label>
            <input
              type="text"
              placeholder="e.g. Flash Flood Warning — Barangay Riverside"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Description *</label>
            <textarea
              rows={4}
              placeholder="Describe the situation, what residents should do, and any other important details."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="two-col-fields">
            <div className="field">
              <label>Emergency Type *</label>
              <select value={alertType} onChange={(e) => setAlertType(e.target.value)} required>
                <option value="">Select type</option>
                {ALERT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Threat Level *</label>
              <select value={threatLevel} onChange={(e) => setThreatLevel(e.target.value)} required>
                <option value="">Select level</option>
                {THREAT_LEVELS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="two-col-fields">
            <div className="field">
              <label>Municipality</label>
              <select value={municipality} onChange={(e) => setMunicipality(e.target.value)}>
                <option value="">All / unspecified</option>
                {MUNICIPALITIES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Specific Location</label>
              <input
                type="text"
                placeholder="Barangay, landmark, or street"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>Photo &amp; Video (optional)</label>
            <div className="upload-row">
              <label className={`upload-slot${photoFile ? " filled" : ""}`}>
                <ImageIcon size={16} /> {photoFile ? photoFile.name : "Add Photo"}
                <input type="file" accept="image/*" hidden onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
              </label>
              <label className={`upload-slot${videoFile ? " filled" : ""}`}>
                <VideoIcon size={16} /> {videoFile ? videoFile.name : "Add Video"}
                <input type="file" accept="video/*" hidden onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button type="button" className="btn-mini" style={{ flex: 1, padding: "10px 0" }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 2, width: "auto" }} disabled={!canSubmit}>
              {submitting ? "Posting…" : "Post Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
