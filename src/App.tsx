import { useState } from 'react';
import PrivacyBanner from './components/PrivacyBanner';
import FormSection from './components/FormSection';
import QRGenerator from './components/QRGenerator';

interface FormData {
  targetUrl: string;
  channel: string;
  addPodcast: boolean;
  podcastName: string;
  addEvent: boolean;
  eventName: string;
  motivationAngle: string[];
  searchContext: string[];
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    targetUrl: '',
    channel: '',
    addPodcast: false,
    podcastName: '',
    addEvent: false,
    eventName: '',
    motivationAngle: [],
    searchContext: [],
  });

  const handleFormChange = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const generateTaggedUrl = (): string => {
    if (!formData.targetUrl) return '';
    try {
      const params = new URLSearchParams();
      params.append('utm_source', formData.addPodcast ? formData.podcastName : formData.channel);
      params.append('utm_medium', 'social');
      params.append('utm_campaign', formData.addEvent ? formData.eventName : formData.channel);
      params.append('utm_content', formData.motivationAngle.join(',') || 'general');
      params.append('utm_term', formData.searchContext.join(',') || 'general');
      const url = new URL(formData.targetUrl);
      url.search = params.toString();
      return url.toString();
    } catch {
      return '';
    }
  };

  const taggedUrl = generateTaggedUrl();

  return (
    <div className="export-wrapper">
      <PrivacyBanner />
      <main className="main-wrapper">
        <header className="page-header">
          <h1>Marketing Attribution &amp; QR Generator</h1>
          <p>Create tracked URLs and custom QR codes for TrialMe campaigns</p>
        </header>
        <div className="dashboard-grid">
          <FormSection formData={formData} onFormChange={handleFormChange} />
          <QRGenerator url={taggedUrl} />
        </div>
      </main>
    </div>
  );
}

export default App;
