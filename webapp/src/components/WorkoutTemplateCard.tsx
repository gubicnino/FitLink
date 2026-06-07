import { ChevronRight, Dumbbell, Hash, Timer } from "lucide-react";
import { colors, radii, spacing } from "../theme";
export interface WorkoutTemplate {
  id: string;
  name: string;
  exerciseCount: number;
  setCount?: number;
  durationMinutes?: number;
  lastUsed?: string;
  tag?: string;
}

interface WorkoutTemplateCardProps {
  template: WorkoutTemplate;
  onPress?: () => void;
}
export function WorkoutTemplateCard({ template, onPress }: WorkoutTemplateCardProps) {
  return (
    <div
      onClick={onPress}
      style={{ ...styles.card, cursor: 'pointer' }}
      role="button"
      aria-label={`Open template ${template.name}`}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onPress?.()}
      onMouseDown={e => (e.currentTarget.style.opacity = '0.92')}
      onMouseUp={e => (e.currentTarget.style.opacity = '1')}
    >
      <div style={styles.accent} />

      <div style={styles.body}>
        <div style={styles.topRow}>
          <div style={styles.titleWrap}>
            <h3>
              {template.name}
            </h3>
            {template.lastUsed ? (
              <p style={{ color: colors.inkMuted, fontSize: 12 }}>
                Last used {template.lastUsed}
              </p>
            ) : null}
          </div>
          <div style={styles.chevronWrap}>
            <ChevronRight size={16} color={colors.inkMuted} strokeWidth={2.25} />
          </div>
        </div>

        <div style={styles.statsRow}>
          <Stat
            icon={<Dumbbell size={12} color={colors.inkSecondary} strokeWidth={2.25} />}
            value={template.exerciseCount}
            label={template.exerciseCount === 1 ? 'exercise' : 'exercises'}
          />
          {template.setCount != null ? (
            <>
              <div style={styles.divider} />
              <Stat
                icon={<Hash size={12} color={colors.inkSecondary} strokeWidth={2.25} />}
                value={template.setCount}
                label={template.setCount === 1 ? 'set' : 'sets'}
              />
            </>
          ) : null}
          {template.durationMinutes != null ? (
            <>
              <div style={styles.divider} />
              <Stat
                icon={<Timer size={12} color={colors.inkSecondary} strokeWidth={2.25} />}
                value={`~${template.durationMinutes}`}
                label="min"
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
const styles: Record<string, React.CSSProperties> = {
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    border: `1px solid ${colors.line}`,
    overflow: 'hidden',
    display: 'flex',
  },
  cardPressed: { opacity: 0.92, transform: 'scale(0.997)' },
  accent: { width: 3, backgroundColor: colors.primary, flexShrink: 0 },

  body: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingLeft: spacing.xl,
    paddingRight: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },

  topRow: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleWrap: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  title: { letterSpacing: -0.2 },
  chevronWrap: {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stat: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 14, lineHeight: '16px', color: colors.inkPrimary },
  statLabel: { letterSpacing: 0.2 },
  divider: { width: 1, height: 12, backgroundColor: colors.line },
};

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div style={styles.stat}>
      {icon}
      <span style={{ ...styles.statValue, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
        {value}
      </span>
      <span style={{ ...styles.statLabel, fontSize: 11, color: colors.inkMuted }}>
        {label}
      </span>
    </div>
  );
}