import { Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { colors, radii, spacing, typography } from '../theme';

export default function NoAccessPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxl,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: colors.surface,
          borderRadius: radii.xxl,
          border: `1px solid ${colors.line}`,
          padding: `${spacing.section}px ${spacing.huge}px`,
          maxWidth: 520,
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spacing.lg,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: radii.pill,
            background: colors.primarySoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.primary,
          }}
        >
          <Smartphone size={32} />
        </div>
        <h1 style={{ ...typography.h2, color: colors.inkPrimary, margin: 0 }}>
          The web app is for trainers and admins
        </h1>
        <p style={{ ...typography.body, color: colors.inkSecondary, margin: 0 }}>
          {user
            ? `Hi ${user.displayName ?? ''}, your account is signed in as a trainee. To access workouts, check-ins and your coach, please use the FitLink Android app.`
            : 'Trainees should use the FitLink Android app to access workouts, check-ins and their coach.'}
        </p>
        <Button label="Log out" variant="ghost" onClick={handleLogout} />
      </div>
    </div>
  );
}
