import { LogOut, ShieldCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { colors, radii, spacing, typography } from '../../theme';
import Avatar from '../ui/Avatar';
import { BrandMark } from '../ui/BrandMark';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Applications', icon: <ShieldCheck size={18} /> },
];

const TRAINER_NAV: NavItem[] = [
  { to: '/trainer', label: 'Clients', icon: <Users size={18} /> },
];

export default function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const nav: NavItem[] =
    user?.role === 'ADMIN' ? ADMIN_NAV : user?.role === 'TRAINER' ? TRAINER_NAV : [];

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        minHeight: '100vh',
        background: colors.bg,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Sidebar — sticky athletic panel ------------------------------- */}
      <aside
        style={{
          background: colors.surface,
          borderRight: `1px solid ${colors.line}`,
          display: 'flex',
          flexDirection: 'column',
          padding: `${spacing.xl}px ${spacing.lg}px`,
          gap: spacing.xl,
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {/* Brand */}
        <div style={{ paddingInline: spacing.xs }}>
          <BrandMark size="sm" />
        </div>

        {/* Role pill */}
        {user?.role ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              padding: '4px 10px',
              borderRadius: radii.pill,
              background: user.role === 'ADMIN' ? 'rgba(255,107,53,0.14)' : colors.primarySoft,
              border: `1px solid ${user.role === 'ADMIN' ? 'rgba(255,107,53,0.32)' : colors.primaryBorder}`,
              color: user.role === 'ADMIN' ? colors.accent : colors.primary,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.8px',
            }}
          >
            {user.role === 'ADMIN' ? <ShieldCheck size={11} /> : <Users size={11} />}
            {user.role}
          </div>
        ) : null}

        {/* Navigation */}
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flex: 1,
          }}
        >
          {nav.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>

        {/* User footer */}
        <div
          style={{
            borderTop: `1px solid ${colors.line}`,
            paddingTop: spacing.md,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.sm,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.xs,
              borderRadius: radii.lg,
              background: colors.surfaceElevated,
            }}
          >
            <Avatar name={user?.displayName} url={user?.avatarUrl} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  ...typography.bodySmall,
                  fontWeight: 800,
                  color: colors.inkPrimary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.displayName ?? 'Account'}
              </div>
              <div
                style={{
                  ...typography.micro,
                  color: colors.inkMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.email}
              </div>
            </div>
          </div>
          <LogoutButton onClick={handleLogout} />
        </div>
      </aside>

      {/* Main content -------------------------------------------------- */}
      <main
        style={{
          padding: `${spacing.xl}px ${spacing.huge}px ${spacing.huge}px`,
          maxWidth: 1280,
          width: '100%',
          margin: '0 auto',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const [hovered, setHovered] = useState(false);
  return (
    <NavLink
      to={item.to}
      end
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ isActive }) => ({
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `10px ${spacing.md}px`,
        borderRadius: radii.lg,
        background: isActive
          ? colors.primarySoft
          : hovered
            ? colors.surfaceElevated
            : 'transparent',
        color: isActive ? colors.primary : colors.inkSecondary,
        ...typography.body,
        fontSize: 14,
        fontWeight: isActive ? 800 : 600,
        textDecoration: 'none',
        transition: 'background 0.12s ease',
      })}
    >
      {({ isActive }) => (
        <>
          {/* Accent bar on the left when active — match mobile section header */}
          {isActive ? (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: -spacing.lg + 6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 3,
                height: 18,
                borderRadius: 2,
                background: colors.accent,
              }}
            />
          ) : null}
          {item.icon}
          {item.label}
        </>
      )}
    </NavLink>
  );
}

function LogoutButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: '8px 14px',
        borderRadius: radii.lg,
        background: hovered ? 'rgba(239,68,68,0.06)' : 'transparent',
        border: `1px solid ${hovered ? 'rgba(239,68,68,0.28)' : colors.line}`,
        color: hovered ? colors.danger : colors.inkSecondary,
        cursor: 'pointer',
        ...typography.bodySmall,
        fontWeight: 700,
        transition: 'all 0.12s ease',
      }}
    >
      <LogOut size={14} />
      Sign out
    </button>
  );
}
