import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { clubsAPI } from '../utils/api';
import { ORGANIZER_CATEGORIES } from '../utils/constants';
import './ClubsPage.css';

function ClubsPage() {
  const { user, login } = useAuth();
  const { showSuccess } = useToast();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const followedClubs = user?.followedClubs || [];

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setLoading(true);
        const response = await clubsAPI.getAllClubs();
        if (response.success) {
          setClubs(response.clubs);
        }
      } catch (err) {
        console.error('Error fetching clubs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);

  const filteredOrganizers = useMemo(() => {
    let result = clubs;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(org =>
        org.name.toLowerCase().includes(lower) ||
        org.description.toLowerCase().includes(lower) ||
        org.category.toLowerCase().includes(lower)
      );
    }

    if (filterCategory !== 'All') {
      result = result.filter(org => org.category === filterCategory);
    }

    return result;
  }, [clubs, searchTerm, filterCategory]);

  const handleFollowToggle = (orgId) => {
    if (!user) return;

    const isFollowing = followedClubs.includes(orgId);
    const updatedClubs = isFollowing
      ? followedClubs.filter(id => id !== orgId)
      : [...followedClubs, orgId];

    const updatedUser = { ...user, followedClubs: updatedClubs };
    login(updatedUser);

    showSuccess(isFollowing ? 'Unfollowed club' : 'Following club');
  };

  return (
    <div className="clubs-page">
      <div className="page-header">
        <div>
          <h1>Clubs & Organizers</h1>
          <p className="subtitle">Discover and follow clubs to stay updated on their events</p>
        </div>
        <div className="stats-badge">
          <span className="stat-value">{followedClubs.length}</span>
          <span className="stat-label">Following</span>
        </div>
      </div>

      <div className="controls-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search clubs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="filter-select"
        >
          <option value="All">All Categories</option>
          {ORGANIZER_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {filteredOrganizers.length === 0 ? (
        <div className="empty-state">
          <p>No clubs found matching your criteria</p>
        </div>
      ) : (
        <div className="clubs-grid">
          {filteredOrganizers.map(org => {
            const isFollowing = followedClubs.includes(org.id);
            return (
              <div key={org.id} className={`club-card ${isFollowing ? 'following' : ''}`}>
                <div className="club-card-header">
                  <div className="club-avatar">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="club-category-badge">{org.category}</span>
                </div>
                
                <div className="club-card-body">
                  <Link to={`/club/${org.id}`} className="club-name-link">
                    <h3>{org.name}</h3>
                  </Link>
                  <p className="club-description">{org.description}</p>
                  
                  <div className="club-stats">
                    <div className="stat-item">
                      <span className="stat-icon">👥</span>
                      <span className="stat-text">{org.followers} followers</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">📅</span>
                      <span className="stat-text">{org.upcomingEvents} upcoming</span>
                    </div>
                  </div>
                </div>

                <div className="club-card-footer">
                  <button
                    className={`btn ${isFollowing ? 'btn-following' : 'btn-primary'}`}
                    onClick={() => handleFollowToggle(org.id)}
                  >
                    {isFollowing ? '✓ Following' : '+ Follow'}
                  </button>
                  <Link to={`/club/${org.id}`} className="btn btn-outline">
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ClubsPage;
