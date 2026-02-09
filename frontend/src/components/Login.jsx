import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';
import { USER_ROLES, PARTICIPANT_TYPES } from '../utils/constants';
import { isValidEmail, isIIITEmail } from '../utils/helpers';
import './Login.css';

const ROLE_REDIRECT = {
  [USER_ROLES.PARTICIPANT]: '/dashboard',
  [USER_ROLES.ORGANIZER]: '/create',
  [USER_ROLES.ADMIN]: '/',
};

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();

  const [role, setRole] = useState(USER_ROLES.PARTICIPANT);
  const [participantType, setParticipantType] = useState(PARTICIPANT_TYPES.IIIT);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      return 'Email and password are required';
    }

    if (!isValidEmail(email)) {
      return 'Please enter a valid email address';
    }

    if (role === USER_ROLES.PARTICIPANT && participantType === PARTICIPANT_TYPES.IIIT) {
      if (!isIIITEmail(email)) {
        return 'IIIT participants must use their IIIT email (@iiit.ac.in)';
      }
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    // Call backend API
    const result = await login({ email, password });
    
    if (result.success) {
      showSuccess(`Welcome back!`);
      
      // Redirect based on user role
      const userRole = result.user?.role || USER_ROLES.PARTICIPANT;
      const hasPrefs = (result.user?.preferences?.interests?.length || 0) > 0
        || (result.user?.preferences?.followedClubs?.length || 0) > 0;
      const redirectTo = userRole === USER_ROLES.PARTICIPANT && !hasPrefs
        ? '/onboarding'
        : (location.state?.from || ROLE_REDIRECT[userRole] || '/');
      navigate(redirectTo, { replace: true });
    } else {
      setError(result.error || 'Invalid credentials');
      showError('Login failed. Please check your credentials.');
    }
    
    // Clear password from state
    setPassword('');
  };

  return (
    <div className="auth-page">
      <div className="container auth-container">
        <div className="auth-card">
          <h1>Sign in</h1>
          <p className="muted">Choose your role and login to continue.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Role</label>
              <div className="role-options">
                {Object.values(USER_ROLES).map((option) => (
                  <label key={option} className={`pill ${role === option ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value={option}
                      checked={role === option}
                      onChange={() => setRole(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            {role === USER_ROLES.PARTICIPANT && (
              <div className="form-group">
                <label>Participant Type</label>
                <div className="role-options">
                  {Object.values(PARTICIPANT_TYPES).map((option) => (
                    <label key={option} className={`pill ${participantType === option ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="participantType"
                        value={option}
                        checked={participantType === option}
                        onChange={() => setParticipantType(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {participantType === PARTICIPANT_TYPES.IIIT && (
                  <p className="hint">IIIT participants must login with institute email only.</p>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            {error && <div className="error-box">{error}</div>}

            <button type="submit" className="btn btn-primary full-width">Login</button>
          </form>

          <div className="auth-notes">
            <p><strong>Test Credentials:</strong></p>
            <p>Participant: participant@iiit.ac.in / password123</p>
            <p>Organizer: organizer@iiit.ac.in / password123</p>
            <p>Admin: admin@iiit.ac.in / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
