import { ChevronRight, Clock, FileText, Inbox, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  trainerApplicationApi,
  type TrainerApplication,
} from '../../api/trainerApplicationApi';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Hero from '../../components/ui/Hero';
import HeroStat from '../../components/ui/HeroStat';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import SectionHeader from '../../components/ui/SectionHeader';
import Tag from '../../components/ui/Tag';
import { useToast } from '../../components/ui/Toast';
import { colors, radii, spacing, typography } from '../../theme';

export default function AdminApplicationsPage() {
  const [items, setItems] = useState<TrainerApplication[] | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await trainerApplicationApi.getPending();
        if (!cancelled) setItems(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setItems([]);
          toast.error('Failed to load applications.');
          console.error(err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const stats = useMemo(() => {
    if (!items) return { pending: 0, withCert: 0, withBio: 0 };
    return {
      pending: items.length,
      withCert: items.filter((a) => Boolean(a.certificateFileName)).length,
      withBio: items.filter((a) => Boolean(a.bio?.trim())).length,
    };
  }, [items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
      <Hero
        eyebrow="ADMIN · TRAINER APPLICATIONS"
        title={items === null ? 'Loading reviews…' : `${stats.pending} pending review${stats.pending === 1 ? '' : 's'}`}
        subtitle="Review the applicant's certificate and bio, then approve or reject. Approved trainers gain the TRAINER role immediately."
        footer={
          items === null ? null : (
            <div style={{ display: 'flex', gap: spacing.xl, paddingTop: 4 }}>
              <HeroStat value={stats.pending} label={stats.pending === 1 ? 'application' : 'applications'} />
              <Divider />
              <HeroStat value={stats.withCert} label="with cert" />
              <Divider />
              <HeroStat value={stats.withBio} label="with bio" />
            </div>
          )
        }
      />

      <section style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <SectionHeader
          label="REVIEW QUEUE"
          count={items?.length ?? null}
          countTone={items && items.length > 0 ? 'accent' : 'neutral'}
        />

        {items === null ? (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.huge }}>
              <LoadingSpinner size={32} />
            </div>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Inbox size={26} />}
              title="No pending applications"
              description="When a new trainer applies, their request will appear here for review."
            />
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {items.map((app) => (
              <ApplicationRow
                key={app.id}
                app={app}
                onClick={() => navigate(`/admin/applications/${app.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


function ApplicationRow({
  app,
  onClick,
}: {
  app: TrainerApplication;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: colors.surface,
        borderRadius: radii.xl,
        border: `1px solid ${colors.line}`,
        padding: spacing.lg,
        cursor: 'pointer',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        {/* Avatar with brand ring */}
        <div
          style={{
            padding: 2,
            borderRadius: '50%',
            background: colors.primarySoft,
          }}
        >
          <Avatar name={app.displayName} size={48} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <h3
              style={{
                ...typography.h3,
                color: colors.inkPrimary,
                margin: 0,
                fontWeight: 800,
                letterSpacing: '-0.2px',
              }}
            >
              {app.displayName}
            </h3>
            <Tag label="Pending" tone="warning" size="sm" icon={<Clock size={10} />} />
          </div>
          <p
            style={{
              ...typography.bodySmall,
              color: colors.inkMuted,
              margin: 0,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {app.email}
          </p>

          {/* Specializations + cert indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              marginTop: spacing.sm,
              flexWrap: 'wrap',
            }}
          >
            {app.specializations && app.specializations.length > 0
              ? app.specializations.slice(0, 4).map((s) => (
                  <Tag key={s} label={s} tone="primary" size="sm" />
                ))
              : (
                <span style={{ ...typography.micro, color: colors.inkMuted }}>
                  No specializations listed
                </span>
              )}
            {app.specializations && app.specializations.length > 4 ? (
              <span style={{ ...typography.micro, color: colors.inkMuted, fontWeight: 700 }}>
                +{app.specializations.length - 4} more
              </span>
            ) : null}
            {app.certificateFileName ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: colors.success,
                  fontSize: 11,
                  fontWeight: 700,
                  marginLeft: 'auto',
                }}
              >
                <FileText size={11} />
                Cert attached
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: colors.inkMuted,
                  fontSize: 11,
                  fontWeight: 700,
                  marginLeft: 'auto',
                }}
              >
                <FileText size={11} />
                No certificate
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
            paddingLeft: spacing.sm,
          }}
        >
          <span
            style={{
              ...typography.bodySmall,
              color: colors.inkMuted,
              fontWeight: 700,
            }}
          >
            {relativeTime(app.submittedAt)}
          </span>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: hovered ? colors.primary : colors.surfaceElevated,
              color: hovered ? colors.white : colors.inkSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <ChevronRight size={16} />
          </div>
        </div>
      </div>

      {/* Decorative accent shield - very subtle */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          opacity: 0.05,
          pointerEvents: 'none',
        }}
      >
        <ShieldCheck size={48} color={colors.primary} />
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      aria-hidden
      style={{
        width: 1,
        background: 'rgba(255,255,255,0.14)',
        marginInline: spacing.xs,
      }}
    />
  );
}


function relativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
