import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Login.css';

const ROLE_REDIRECT = {
  Participant: '/',
  Organizer: '/create',
  Admin: '/',
};

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState('Participant');
  const [participantType, setParticipantType] = useState('IIIT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      return 'Email and password are required';
    }

    if (role === 'Participant' && participantType === 'IIIT') {
      if (!email.toLowerCase().endsWith('@iiit.ac.in')) {
        return 'IIIT participants must use their IIIT email (@iiit.ac.in)';
      }
    }

    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    login({ role, email, participantType });
    const redirectTo = location.state?.from || ROLE_REDIRECT[role] || '/';
    navigate(redirectTo, { replace: true });
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
                {['Participant', 'Organizer', 'Admin'].map((option) => (
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

            {role === 'Participant' && (
              <div className="form-group">
                <label>Participant Type</label>
                <div className="role-options">
                  {['IIIT', 'Non-IIIT'].map((option) => (
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
                {participantType === 'IIIT' && (
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
            <p><strong>Organizer:</strong> Accounts are provisioned by Admin; password resets via Admin only.</p>
            <p><strong>Admin:</strong> First user in system; credentials handled by backend only.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
