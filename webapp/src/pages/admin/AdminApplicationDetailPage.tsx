import { ArrowLeft, Check, Clock, Download, FileText, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  trainerApplicationApi,
  type TrainerApplication,
} from '../../api/trainerApplicationApi';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import SectionHeader from '../../components/ui/SectionHeader';
import Tag from '../../components/ui/Tag';
import { useToast } from '../../components/ui/Toast';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [app, setApp] = useState<TrainerApplication | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [certUrl, setCertUrl] = useState<string | null>(null);
  const certBlobRef = useRef<string | null>(null);
  const [certLoading, setCertLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const list = await trainerApplicationApi.getPending();
        if (cancelled) return;
        const found = list.find((a) => a.id === id) ?? null;
        if (!found) setLoadError('Application not found or already reviewed.');
        else setApp(found);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setLoadError('Failed to load application.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const fileName = app?.certificateFileName;
    if (!fileName) return;
    setCertLoading(true);
    (async () => {
      try {
        const blob = await trainerApplicationApi.fetchCertificateBlob(fileName);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        certBlobRef.current = url;
        setCertUrl(url);
      } catch (err) {
        if (!cancelled) console.error('cert load failed', err);
      } finally {
        if (!cancelled) setCertLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (certBlobRef.current) URL.revokeObjectURL(certBlobRef.current);
      certBlobRef.current = null;
    };
  }, [app?.certificateFileName]);

  const isPdf = useMemo(
    () => app?.certificateMimeType?.includes('pdf') ?? false,
    [app?.certificateMimeType],
  );
  const isImage = useMemo(
    () => app?.certificateMimeType?.startsWith('image/') ?? false,
    [app?.certificateMimeType],
  );

  const handleApprove = async () => {
    if (!app) return;
    setBusy(true);
    try {
      await trainerApplicationApi.approve(app.id);
      toast.success(`${app.displayName} approved as a trainer.`);
      navigate('/admin');
    } catch (err) {
      console.error(err);
      toast.error('Could not approve application.');
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!app) return;
    if (rejectReason.trim().length < 5) {
      toast.error('Please write a short reason (at least 5 characters).');
      return;
    }
    setBusy(true);
    try {
      await trainerApplicationApi.reject(app.id, rejectReason.trim());
      toast.success(`${app.displayName} rejected.`);
      navigate('/admin');
    } catch (err) {
      console.error(err);
      toast.error('Could not reject application.');
      setBusy(false);
    }
  };

  const handleCertDownload = () => {
    if (!certUrl || !app?.certificateFileName) return;
    const a = document.createElement('a');
    a.href = certUrl;
    a.download = app.certificateFileName;
    a.click();
  };

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        <BackLink onClick={() => navigate('/admin')} />
        <Card>
          <p style={{ ...typography.body, color: colors.danger, margin: 0 }}>{loadError}</p>
        </Card>
      </div>
    );
  }

  if (!app) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.huge }}>
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
      <BackLink onClick={() => navigate('/admin')} />

      {/* Applicant identity hero ------------------------------------- */}
      <div
        style={{
          background: colors.primary,
          color: colors.white,
          borderRadius: radii.xxl,
          padding: spacing.xl,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: shadows.card,
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -100,
            right: -80,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: colors.primaryDark,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            display: 'flex',
            gap: spacing.lg,
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Avatar ring */}
          <div
            style={{
              padding: 4,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
            }}
          >
            <Avatar name={app.displayName} size={84} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '1.4px',
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              TRAINER APPLICATION
            </div>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '-0.5px',
                margin: 0,
                marginTop: 4,
                color: colors.white,
              }}
            >
              {app.displayName}
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.78)',
                margin: 0,
                marginTop: 2,
              }}
            >
              {app.email}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: radii.pill,
                  background: 'rgba(245,158,11,0.18)',
                  border: '1px solid rgba(245,158,11,0.45)',
                  color: '#FCD34D',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '1px',
                }}
              >
                <Clock size={11} />
                PENDING
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                Submitted {new Date(app.submittedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bio --------------------------------------------------------- */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <SectionHeader label="ABOUT" />
        <Card padding="xl">
          <p
            style={{
              ...typography.body,
              color: colors.inkPrimary,
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {app.bio?.trim() || (
              <span style={{ color: colors.inkMuted, fontStyle: 'italic' }}>
                No bio provided.
              </span>
            )}
          </p>
        </Card>
      </section>

      {/* Specializations -------------------------------------------- */}
      {app.specializations && app.specializations.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <SectionHeader label="SPECIALIZATIONS" count={app.specializations.length} />
          <Card padding="xl">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {app.specializations.map((s) => (
                <Tag
                  key={s}
                  label={s}
                  tone="primary"
                  icon={<Sparkles size={10} />}
                />
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      {/* Certificate ------------------------------------------------- */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <SectionHeader
          label="CERTIFICATE"
          action={
            app.certificateFileName && certUrl ? (
              <Button
                label="Download"
                variant="ghost"
                size="sm"
                onClick={handleCertDownload}
                leftIcon={<Download size={13} />}
              />
            ) : null
          }
        />
        <Card padding="xl">
          {!app.certificateFileName ? (
            <p style={{ ...typography.body, color: colors.inkMuted, margin: 0 }}>
              No certificate uploaded with this application.
            </p>
          ) : certLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xxl }}>
              <LoadingSpinner size={28} />
            </div>
          ) : !certUrl ? (
            <p style={{ ...typography.body, color: colors.danger, margin: 0 }}>
              Could not load certificate file.
            </p>
          ) : isPdf ? (
            <iframe
              src={certUrl}
              title="Certificate preview"
              style={{
                width: '100%',
                height: 600,
                border: `1px solid ${colors.line}`,
                borderRadius: radii.lg,
                background: colors.surfaceElevated,
              }}
            />
          ) : isImage ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: spacing.md,
                borderRadius: radii.lg,
                background: colors.surfaceElevated,
                border: `1px solid ${colors.line}`,
              }}
            >
              <img
                src={certUrl}
                alt="Certificate"
                style={{ maxWidth: '100%', maxHeight: 600, objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.lg,
                borderRadius: radii.lg,
                background: colors.surfaceElevated,
                border: `1px solid ${colors.line}`,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radii.lg,
                  background: colors.primarySoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.primary,
                }}
              >
                <FileText size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...typography.body, color: colors.inkPrimary, fontWeight: 700 }}>
                  {app.certificateFileName}
                </div>
                <div style={{ ...typography.bodySmall, color: colors.inkMuted }}>
                  {app.certificateMimeType ?? 'unknown type'}
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Decision action bar ----------------------------------------- */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          marginInline: -spacing.huge,
          padding: `${spacing.md}px ${spacing.huge}px`,
          background: colors.surface,
          borderTop: `1px solid ${colors.line}`,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          zIndex: 5,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...typography.caption, color: colors.inkMuted, fontWeight: 800, letterSpacing: '0.8px', fontSize: 10 }}>
            DECISION
          </div>
          <div
            style={{
              ...typography.bodySmall,
              color: colors.inkSecondary,
              marginTop: 2,
            }}
          >
            Approving grants the TRAINER role immediately. Rejecting requires a short reason visible to the applicant.
          </div>
        </div>
        <Button
          label="Reject"
          variant="ghost"
          size="md"
          onClick={() => setRejectOpen(true)}
          disabled={busy}
          leftIcon={<X size={15} />}
        />
        <Button
          label="Approve"
          variant="primary"
          size="md"
          onClick={handleApprove}
          disabled={busy}
          leftIcon={<Check size={15} />}
        />
      </div>

      {/* Reject modal ----------------------------------------------- */}
      <Modal
        open={rejectOpen}
        onClose={() => (busy ? undefined : setRejectOpen(false))}
        title={`Reject ${app.displayName}'s application`}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onClick={() => setRejectOpen(false)} disabled={busy} />
            <Button label="Reject application" variant="danger" onClick={handleReject} disabled={busy} />
          </>
        }
      >
        <p style={{ ...typography.body, color: colors.inkSecondary, margin: 0, marginBottom: spacing.md }}>
          Explain briefly why this application is being rejected. The applicant will see this message in their account.
        </p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. The uploaded certificate could not be verified with the issuing body."
          rows={5}
          autoFocus
          style={{
            width: '100%',
            padding: spacing.md,
            borderRadius: radii.lg,
            border: `1px solid ${colors.line}`,
            background: colors.bg,
            ...typography.body,
            color: colors.inkPrimary,
            resize: 'vertical',
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </Modal>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        border: 'none',
        color: hovered ? colors.primary : colors.inkSecondary,
        cursor: 'pointer',
        padding: 0,
        ...typography.bodySmall,
        fontWeight: 700,
        transition: 'color 0.12s',
        alignSelf: 'flex-start',
      }}
    >
      <ArrowLeft size={16} />
      Back to applications
    </button>
  );
}
