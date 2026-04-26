interface ForbiddenPageProps {
  title?: string;
  message?: string;
  onGoHome?: () => void;
}

export function ForbiddenPage({
  title = '403 - Forbidden',
  message = 'You do not have permission to access this route. Contact a head admin if you need elevated access.',
  onGoHome,
}: ForbiddenPageProps) {
  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 560,
        background: '#fff',
        border: '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-sm)',
        padding: 24,
      }}>
        <div style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          color: 'var(--ink-mute)',
          fontWeight: 700,
          marginBottom: 8,
        }}>
          Access Control
        </div>
        <h2 style={{ margin: 0, color: 'var(--burgundy)', fontSize: 24, lineHeight: 1.2 }}>{title}</h2>
        <p style={{ marginTop: 10, color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.65 }}>{message}</p>
        {onGoHome && (
          <button className="btn btn-primary" onClick={onGoHome} style={{ marginTop: 14 }}>
            Back to Overview
          </button>
        )}
      </div>
    </div>
  );
}
