import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, FileText, Upload, Palette, Copy, Check, X as XIcon } from 'lucide-react';
import jsPDF from 'jspdf';

interface QRGeneratorProps {
  url: string;
}

const isValidHex = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const QRGenerator: React.FC<QRGeneratorProps> = ({ url }) => {
  const [bgColor, setBgColor] = useState('#ffffff');
  const [fgColor, setFgColor] = useState('#000000');
  // Separate text-input state so users can type intermediate values
  const [bgInput, setBgInput] = useState('#ffffff');
  const [fgInput, setFgInput] = useState('#000000');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const bgColorRef = useRef<HTMLInputElement>(null);
  const fgColorRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBgPicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBgColor(e.target.value);
    setBgInput(e.target.value);
  };
  const handleFgPicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFgColor(e.target.value);
    setFgInput(e.target.value);
  };
  const handleBgText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setBgInput(v);
    if (isValidHex(v)) setBgColor(v);
  };
  const handleFgText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setFgInput(v);
    if (isValidHex(v)) setFgColor(v);
  };

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

  const buildCompositeCanvas = (): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const qrCanvas = qrCodeRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
      if (!qrCanvas) return reject(new Error('QR canvas not found'));

      const qrSize = qrCanvas.width;
      const pagePadding = Math.round(qrSize * 0.28);
      const size = qrSize + pagePadding * 2;
      const out = document.createElement('canvas');
      out.width = size;
      out.height = size;
      const ctx = out.getContext('2d')!;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(qrCanvas, pagePadding, pagePadding);

      if (!logoUrl) return resolve(out);

      const img = new Image();
      img.onload = () => {
        const logoSize = Math.round(qrSize * 0.22);
        const pad = 5;
        const x = pagePadding + (qrSize - logoSize) / 2;
        const y = pagePadding + (qrSize - logoSize) / 2;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        // Use roundRect if available, fall back to plain rect
        if (ctx.roundRect) {
          ctx.roundRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, 4);
        } else {
          ctx.rect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2);
        }
        ctx.fill();
        ctx.drawImage(img, x, y, logoSize, logoSize);
        resolve(out);
      };
      img.onerror = reject;
      img.src = logoUrl;
    });
  };

  const downloadPNG = async () => {
    if (!url) return;
    try {
      const canvas = await buildCompositeCanvas();
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'trialme-campaign-qr.png';
      link.click();
    } catch (err) {
      console.error('Failed to export PNG:', err);
    }
  };

  const downloadPDF = async () => {
    if (!url) return;
    try {
      const canvas = await buildCompositeCanvas();
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const { r, g, b } = hexToRgb(bgColor);
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

      const imgSize = 130;
      pdf.addImage(imgData, 'PNG', (pdfWidth - imgSize) / 2, (pdfHeight - imgSize) / 2, imgSize, imgSize);
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
        <div className="qr-code-frame" ref={qrCodeRef} style={{ backgroundColor: bgColor }}>
          {url ? (
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <QRCodeCanvas
                value={url}
                size={168}
                level="H"
                includeMargin
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
            <div className="color-input-shell" title="Pick background colour">
              <input
                ref={bgColorRef}
                type="color"
                value={bgColor}
                onChange={handleBgPicker}
                style={{ width: 26, height: 26, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', flexShrink: 0 }}
              />
              <input
                type="text"
                value={bgInput}
                onChange={handleBgText}
                onBlur={() => { if (!isValidHex(bgInput)) setBgInput(bgColor); }}
                maxLength={7}
                spellCheck={false}
                className="color-hex-input"
              />
            </div>
          </div>
          <div className="color-control">
            <div className="color-label">
              <Palette size={13} />
              <span>Foreground</span>
            </div>
            <div className="color-input-shell" title="Pick foreground colour">
              <input
                ref={fgColorRef}
                type="color"
                value={fgColor}
                onChange={handleFgPicker}
                style={{ width: 26, height: 26, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', flexShrink: 0 }}
              />
              <input
                type="text"
                value={fgInput}
                onChange={handleFgText}
                onBlur={() => { if (!isValidHex(fgInput)) setFgInput(fgColor); }}
                maxLength={7}
                spellCheck={false}
                className="color-hex-input"
              />
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
