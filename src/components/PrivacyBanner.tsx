import React from 'react';
import { ShieldCheck } from 'lucide-react';

const PrivacyBanner: React.FC = () => {
  return (
    <div className="top-banner">
      <div className="top-banner-icon">
        <ShieldCheck size={20} />
      </div>
      <div className="top-banner-content">
        <h4>Privacy First:</h4>
        <p>This is a client-side tool. No data is stored on our servers. Refreshing the page will clear all inputs.</p>
      </div>
    </div>
  );
};

export default PrivacyBanner;
