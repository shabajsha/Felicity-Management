import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { PARTICIPANT_TYPES, AREAS_OF_INTEREST } from '../utils/constants';
import { clubsAPI } from '../utils/api';
import './ProfilePage.css';

function ProfilePage() {
  const { user, updateProfile, updatePassword } = useAuth();
  const { showSuccess, showError } = useToast();
  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    participantType: '',
    college: '',
    contactNumber: '',
    interests: [],
    followedClubs: [],
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        participantType: user.participantType || '',
        college: user.college || '',
        contactNumber: user.contactNumber || '',
        interests: user.preferences?.interests || [],
        followedClubs: (user.preferences?.followedClubs || []).map(clubItem => clubItem._id || clubItem),
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setLoadingClubs(true);
        const response = await clubsAPI.getAll();
        if (response.success) {
          setClubs(response.data || []);
        }
      } finally {
        setLoadingClubs(false);
      }
    };

    fetchClubs();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const toggleClub = (clubId) => {
    setFormData(prev => ({
      ...prev,
      followedClubs: prev.followedClubs.includes(clubId)
        ? prev.followedClubs.filter(id => id !== clubId)
        : [...prev.followedClubs, clubId]
    }));
  };

  const handleSave = async () => {
    if (!formData.firstName.trim()) {
      showError('First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      showError('Last name is required');
      return;
    }
    if (!formData.contactNumber.trim()) {
      showError('Contact number is required');
      return;
    }
    if (formData.participantType === PARTICIPANT_TYPES.NON_IIIT && !formData.college.trim()) {
      showError('College/Organization is required');
      return;
    }

    const result = await updateProfile({
      firstName: formData.firstName,
      lastName: formData.lastName,
      contactNumber: formData.contactNumber,
      college: formData.college,
      interests: formData.interests,
      followedClubs: formData.followedClubs,
    });

    if (result.success) {
      setIsEditing(false);
      showSuccess('Profile updated successfully!');
    } else {
      showError(result.error || 'Failed to update profile');
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showError('All password fields are required');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showError('New password must be at least 6 characters');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    const result = await updatePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });

    if (result.success) {
      showSuccess('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      showError(result.error || 'Failed to update password');
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div>
          <h1>Profile Settings</h1>
          <p className="subtitle">Manage your account information and preferences</p>
        </div>
        {!isEditing ? (
          <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
            ✏️ Edit Profile
          </button>
        ) : (
          <div className="button-group">
            <button className="btn btn-secondary" onClick={() => {
              setIsEditing(false);
              // Reset form data
              setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                participantType: user.participantType || '',
                college: user.college || '',
                contactNumber: user.contactNumber || '',
                interests: user.preferences?.interests || [],
                followedClubs: (user.preferences?.followedClubs || []).map(clubItem => clubItem._id || clubItem),
              });
            }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              💾 Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h2>Personal Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter first name"
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter last name"
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="disabled-input"
              />
              <span className="field-note">Email cannot be changed</span>
            </div>
            <div className="form-group">
              <label>Participant Type</label>
              <input
                type="text"
                value={formData.participantType}
                disabled
                className="disabled-input"
              />
              <span className="field-note">Participant type cannot be changed</span>
            </div>
            <div className="form-group">
              <label>Contact Number *</label>
              <input
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter contact number"
              />
            </div>
            <div className="form-group">
              <label>College / Organization {formData.participantType === PARTICIPANT_TYPES.NON_IIIT && '*'}</label>
              <input
                type="text"
                name="college"
                value={formData.participantType === PARTICIPANT_TYPES.IIIT ? 'IIIT Hyderabad' : formData.college}
                onChange={handleChange}
                disabled={!isEditing || formData.participantType === PARTICIPANT_TYPES.IIIT}
                placeholder="Enter college or organization"
                className={formData.participantType === PARTICIPANT_TYPES.IIIT ? 'disabled-input' : ''}
              />
              {formData.participantType === PARTICIPANT_TYPES.IIIT && (
                <span className="field-note">Auto-tagged as IIIT Hyderabad</span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h2>Areas of Interest</h2>
          <p className="section-description">Select topics you're interested in to get personalized event recommendations</p>
          <div className="interests-grid">
            {AREAS_OF_INTEREST.map(interest => (
              <label key={interest} className={`interest-chip ${formData.interests.includes(interest) ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.interests.includes(interest)}
                  onChange={() => toggleInterest(interest)}
                  disabled={!isEditing}
                />
                <span>{interest}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="profile-section">
          <h2>Followed Clubs & Organizers</h2>
          <p className="section-description">Follow clubs to get notified about their events and see them in your feed</p>
          <div className="clubs-grid">
            {loadingClubs && (
              <div className="empty-message">Loading clubs...</div>
            )}
            {!loadingClubs && clubs.map(club => (
              <label key={club._id} className={`club-card ${formData.followedClubs.includes(club._id) ? 'following' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.followedClubs.includes(club._id)}
                  onChange={() => toggleClub(club._id)}
                  disabled={!isEditing}
                />
                <div className="club-info">
                  <h3>{club.name}</h3>
                  <span className="club-category">{club.category}</span>
                  <p className="club-description">{club.description}</p>
                  {formData.followedClubs.includes(club._id) && (
                    <span className="following-badge">✓ Following</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="profile-section">
          <h2>Security Settings</h2>
          <div className="security-actions">
            <button className="btn btn-outline" onClick={() => setShowPasswordModal(true)}>
              🔒 Change Password
            </button>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handlePasswordChange}>
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
