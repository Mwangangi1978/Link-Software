import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, FileText, Upload, Palette, Copy, Check, X as XIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface QRGeneratorProps {
  url: string;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ url }) => {
  const [bgColor, setBgColor] = useState('#ffffff');
  const [fgColor, setFgColor] = useState('#000000');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const bgColorRef = useRef<HTMLInputElement>(null);
  const fgColorRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCopyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const downloadPNG = () => {
    if (!url || !qrCodeRef.current) return;
    const canvas = qrCodeRef.current.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'trialme-campaign-qr.png';
      link.click();
    }
  };

  const downloadPDF = async () => {
    if (!url || !qrRef.current) return;
    try {
      const canvas = await html2canvas(qrRef.current, { backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(16);
      pdf.text('TrialMe Campaign QR Code', pdfWidth / 2, 20, { align: 'center' });
      const imgSize = 100;
      pdf.addImage(imgData, 'PNG', (pdfWidth - imgSize) / 2, 35, imgSize, imgSize);
      pdf.setFontSize(10);
      const urlText = pdf.splitTextToSize(url, pdfWidth - 40);
      pdf.text(urlText, 20, pdfHeight - 45);
      pdf.save('trialme-campaign-qr.pdf');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  return (
    <div className="step-card" id="output-card">
      <div className="step-header">
        <div className="step-number">3</div>
        <h2 className="step-title">Generated Output</h2>
      </div>

      {/* QR Preview */}
      <div className="qr-preview-card" ref={qrRef}>
        <div className="qr-code-frame" ref={qrCodeRef}>
          {url ? (
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <QRCodeCanvas
                value={url}
                size={168}
                level="H"
                includeMargin={false}
                bgColor={bgColor}
                fgColor={fgColor}
              />
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="logo overlay"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    padding: '4px',
                  }}
                />
              )}
            </div>
          ) : (
            <div
              style={{
                width: 168,
                height: 168,
                background: 'rgba(255,255,255,0.25)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          )}
        </div>
        <div className="qr-meta">
          {url ? 'Tracked QR ready for campaign export' : 'Enter a target URL to generate QR code'}
        </div>
      </div>

      {/* URL Preview */}
      {url && (
        <div className="url-preview-section">
          <div className="url-preview-label">Generated URL</div>
          <div className="url-preview-text">{url}</div>
          <button className="url-copy-btn" onClick={handleCopyUrl}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
        </div>
      )}

      {/* QR Controls */}
      <div className="qr-controls">
        {/* Color pickers */}
        <div className="color-control-row">
          <div className="color-control">
            <div className="color-label">
              <Palette size={13} />
              <span>Background</span>
            </div>
            <div
              className="color-input-shell"
              onClick={() => bgColorRef.current?.click()}
              title="Pick background colour"
            >
              <input
                ref={bgColorRef}
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                style={{ display: 'none' }}
              />
              <div className="color-swatch" style={{ background: bgColor }} />
              <div className="color-value">{bgColor}</div>
            </div>
          </div>
          <div className="color-control">
            <div className="color-label">
              <Palette size={13} />
              <span>Foreground</span>
            </div>
            <div
              className="color-input-shell"
              onClick={() => fgColorRef.current?.click()}
              title="Pick foreground colour"
            >
              <input
                ref={fgColorRef}
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                style={{ display: 'none' }}
              />
              <div className="color-swatch" style={{ background: fgColor }} />
              <div className="color-value">{fgColor}</div>
            </div>
          </div>
        </div>

        {/* Logo upload */}
        <div className="logo-upload-card">
          <div className="logo-upload-header">
            <Upload size={14} />
            <div className="qr-customization-title">Logo Customization (Optional)</div>
          </div>
          {!logoUrl ? (
            <label className="upload-dropzone">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              <div className="upload-title">Click to upload logo</div>
              <div className="upload-subtext">PNG, JPG or GIF</div>
            </label>
          ) : (
            <div className="logo-uploaded-row">
              <span className="upload-title">Logo uploaded</span>
              <button
                className="logo-remove-btn"
                onClick={() => setLogoUrl(null)}
              >
                <XIcon size={11} />
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Export actions */}
        <div className="action-row">
          <button className="action-btn" onClick={downloadPNG} disabled={!url}>
            <Download size={16} />
            <span>Download PNG</span>
          </button>
          <button className="action-btn" onClick={downloadPDF} disabled={!url}>
            <FileText size={16} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
