import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { BrandMark } from '../components/ui/BrandMark';
import Button from '../components/ui/Button';
import Divider from '../components/ui/Divider';
import Input from '../components/ui/Input';
import { authService } from '../services/authService';
import { colors, fontFamily, radii, shadows, spacing, typography } from '../theme';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
interface LoginPageProps {
  onForgotPassword?: () => void;
}

export default function LoginPage({
  onForgotPassword,
}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      // 1. Login to Firebase
      await authService.login(email, password);
      
      try {
        // 2. Verify user exists in backend
        const response = await apiClient.post('/auth/login');
        
        if (!response.data || !response.data.id) {
          await authService.logout();
          throw new Error('User not found in database');
        }
        
        navigate('/home');
        
      } catch (backendError) {
        await authService.logout();
        throw backendError;
      }
    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMessage);
      console.error('Login failed:', err);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
     try {
      // 1. Login to Firebase
      await authService.googleSignin();
      console.log('Google sign-in successful', authService.getUser());

      
      try {
        // 2. Verify user exists in backend
        const response = await apiClient.post('/auth/login');
        
        if (!response.data || !response.data.id) {
          await authService.logout();
          throw new Error('User not found in database');
        }
        navigate('/');
      } catch (backendError) {
        await authService.logout();
        throw backendError;
      }
    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMessage);
      console.error('Login failed:', err);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${colors.bg}; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px ${colors.bg} inset !important;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-card   { animation: fadeUp 0.45s ease both; }
        .login-item-1 { animation: fadeUp 0.45s 0.06s ease both; }
        .login-item-2 { animation: fadeUp 0.45s 0.12s ease both; }
        .login-item-3 { animation: fadeUp 0.45s 0.18s ease both; }
        .login-item-4 { animation: fadeUp 0.45s 0.24s ease both; }
        .login-item-5 { animation: fadeUp 0.45s 0.30s ease both; }
        .login-item-6 { animation: fadeUp 0.45s 0.36s ease both; }
        .link-text { cursor: pointer; transition: opacity 0.15s; }
        .link-text:hover { opacity: 0.65; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Full-page wrapper */}
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: `${spacing.section}px ${spacing.xxl}px`,
        fontFamily: fontFamily.sans,
      }}>

        {/* Card */}
        <div className="login-card" style={{
          width: '100%',
          background: colors.surface,
          borderRadius: radii.xxl,
          border: `1px solid ${colors.line}`,
          boxShadow: shadows.modal,
          padding: `${spacing.section}px ${spacing.section}px`,
          position: 'relative', zIndex: 1,
        }}>

          <div className="login-item-1" style={{ marginBottom: spacing.xxxl }}>
            <BrandMark size="md" />
          </div>

          <div className="login-item-2" style={{ marginBottom: spacing.xxxl }}>
            <h1 style={{
              ...typography.display,
              color: colors.inkPrimary,
              marginBottom: spacing.sm,
            }}>
              Welcome back
            </h1>
            <p style={{
              ...typography.bodyLarge,
              color: colors.inkSecondary,
            }}>
              Train smarter with your coach
            </p>
          </div>

          <div className="login-item-3" style={{
            display: 'flex', flexDirection: 'column',
            gap: spacing.lg, marginBottom: spacing.md,
          }}>
            <Input
              label="Email"
              value={email}
              onChange={v => { setEmail(v); setError(''); }}
              type="email"
              autoComplete="email"
            />
            <Input
              label="Password"
              value={password}
              onChange={v => { setPassword(v); setError(''); }}
              type="password"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              borderLeft: `3px solid ${colors.danger}`,
              borderRadius: radii.md,
              padding: `${spacing.sm}px ${spacing.md}px`,
              marginBottom: spacing.md,
            }}>
              <span style={{ ...typography.bodySmall, fontWeight: 600, color: colors.danger }}>
                {error}
              </span>
            </div>
          )}

          <div className="login-item-4" style={{
            display: 'flex', justifyContent: 'flex-end',
            marginBottom: spacing.xxl,
          }}>
            <span
              className="link-text"
              onClick={onForgotPassword}
              style={{ ...typography.bodySmall, fontWeight: 600, color: colors.primary }}
            >
              Forgot password?
            </span>
          </div>
          <div className="login-item-5">
            <Button
              label="Log in"
              variant="primary"
              fullWidth
              disabled={isLoading}
              onClick={handleLogin}
            />
          </div>

          <Divider label="or" />

          {/* Google */}
          <div className="login-item-6">
            <Button
              label="Sign in with Google"
              variant="ghost"
              fullWidth
              disabled={isLoading}
              leftIcon={<GoogleIcon size={20} />}
              onClick={handleGoogleLogin}
            />
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: colors.overlayDarker,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            border: `3px solid rgba(255,255,255,0.2)`,
            borderTopColor: colors.white,
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      )}
    </>
  );
}