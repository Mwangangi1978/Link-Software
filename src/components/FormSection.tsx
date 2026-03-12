import React from 'react';
import {
  X,
  Instagram,
  Facebook,
  Linkedin,
  Music,
  Youtube,
  Twitter,
  Mail,
  CheckCircle2,
  Plus,
  Minus,
} from 'lucide-react';

interface FormSectionProps {
  formData: {
    targetUrl: string;
    channel: string;
    addPodcast: boolean;
    podcastName: string;
    addEvent: boolean;
    eventName: string;
    motivationAngle: string[];
    searchContext: string[];
  };
  onFormChange: (updates: any) => void;
}

const PLATFORMS = [
  { id: 'Instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'Facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'LinkedIn', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'TikTok', label: 'TikTok', icon: Music, color: '#1a1a1a' },
  { id: 'YouTube', label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'X', label: 'X / Twitter', icon: Twitter, color: '#1a1a1a' },
  { id: 'Substack', label: 'Substack', icon: Mail, color: '#FF6D00' },
];

const MOTIVATION_OPTIONS = ['Educational', 'Financial', 'Community', 'Health'];

const SEARCH_OPTIONS = [
  { id: 'self', label: 'Looking for self' },
  { id: 'others', label: 'Looking for someone else' },
];

const FormSection: React.FC<FormSectionProps> = ({ formData, onFormChange }) => {
  const handleInputChange = (field: string, value: any) => {
    onFormChange({ [field]: value });
  };

  const toggleMotivationAngle = (angle: string) => {
    const updated = formData.motivationAngle.includes(angle)
      ? formData.motivationAngle.filter(a => a !== angle)
      : [...formData.motivationAngle, angle];
    handleInputChange('motivationAngle', updated);
  };

  const toggleSearchContext = (context: string) => {
    const updated = formData.searchContext.includes(context)
      ? formData.searchContext.filter(c => c !== context)
      : [...formData.searchContext, context];
    handleInputChange('searchContext', updated);
  };

  return (
    <>
      {/* ── Column 1: Destination & Channel ── */}
      <div className="step-card" id="destination-card">
        <div className="step-header">
          <div className="step-number">1</div>
          <h2 className="step-title">Destination &amp; Channel</h2>
        </div>

        <div className="form-group">
          <label className="form-label">Target URL*</label>
          <span className="form-help">The landing page or destination URL for your campaign</span>
          <input
            type="url"
            className="form-input"
            value={formData.targetUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleInputChange('targetUrl', e.target.value)
            }
            placeholder="https://www.trialme.com/landing"
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Select Channel</label>
          <span className="form-help">Choose the social media platform</span>
          <div className="channel-list">
            {/* None option */}
            <div
              className={`channel-row${formData.channel === '' ? ' active' : ''}`}
              onClick={() => handleInputChange('channel', '')}
            >
              <div className="channel-row-icon">
                <X size={20} color="#fdfdfd" />
              </div>
              <span className="channel-row-label">None</span>
              {formData.channel === '' && (
                <div className="channel-row-check">
                  <CheckCircle2 size={18} color="#fdfdfd" />
                </div>
              )}
            </div>

            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isSelected = formData.channel === platform.id;
              return (
                <div
                  key={platform.id}
                  className={`channel-row${isSelected ? ' active' : ''}`}
                  onClick={() => handleInputChange('channel', platform.id)}
                >
                  <div className="channel-row-icon">
                    <Icon size={20} color={platform.color} />
                  </div>
                  <span className="channel-row-label">{platform.label}</span>
                  {isSelected && (
                    <div className="channel-row-check">
                      <CheckCircle2 size={18} color="#fdfdfd" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Column 2: Campaign Attributes ── */}
      <div className="step-card" id="attributes-card">
        <div className="step-header">
          <div className="step-number">2</div>
          <h2 className="step-title">Campaign Attributes</h2>
        </div>

        {/* Offline Attribution */}
        <div className="form-group">
          <label className="form-label">Offline Attribution</label>
          <span className="form-help">Track specific offline marketing efforts</span>

          <button
            className={`attribution-btn podcast${formData.addPodcast ? ' expanded' : ''}`}
            onClick={() => handleInputChange('addPodcast', !formData.addPodcast)}
          >
            <span>
              {formData.addPodcast
                ? `Podcast: ${formData.podcastName || 'Enter name…'}`
                : 'Add Podcast Attribution'}
            </span>
            {formData.addPodcast ? <Minus size={16} /> : <Plus size={16} />}
          </button>
          {formData.addPodcast && (
            <div className="attribution-input-wrapper">
              <input
                type="text"
                className="form-input"
                value={formData.podcastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('podcastName', e.target.value)
                }
                placeholder="Enter podcast name"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <button
            className={`attribution-btn event${formData.addEvent ? ' expanded' : ''}`}
            onClick={() => handleInputChange('addEvent', !formData.addEvent)}
            style={{ marginBottom: formData.addEvent ? 0 : 0 }}
          >
            <span>
              {formData.addEvent
                ? `Event: ${formData.eventName || 'Enter name…'}`
                : 'Add Event Attribution'}
            </span>
            {formData.addEvent ? <Minus size={16} /> : <Plus size={16} />}
          </button>
          {formData.addEvent && (
            <div className="attribution-input-wrapper">
              <input
                type="text"
                className="form-input"
                value={formData.eventName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('eventName', e.target.value)
                }
                placeholder="Enter event name"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>

        {/* Motivation Angle */}
        <div className="form-group">
          <label className="form-label">Motivation Angle</label>
          <span className="form-help">Select all that apply to your campaign</span>
          <div className="tag-grid">
            {MOTIVATION_OPTIONS.map((angle) => (
              <div
                key={angle}
                className={`tag-item${formData.motivationAngle.includes(angle) ? ' active' : ''}`}
                onClick={() => toggleMotivationAngle(angle)}
              >
                {angle}
              </div>
            ))}
          </div>
        </div>

        {/* Search Context */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Search Context</label>
          <span className="form-help">Who is the user looking for?</span>
          <div className="tag-grid" style={{ gridTemplateColumns: '1fr' }}>
            {SEARCH_OPTIONS.map((option) => (
              <div
                key={option.id}
                className={`tag-item${formData.searchContext.includes(option.id) ? ' active' : ''}`}
                onClick={() => toggleSearchContext(option.id)}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default FormSection;
