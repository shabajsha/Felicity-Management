import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';
import { clubsAPI } from '../utils/api';
import { CLUB_CATEGORIES } from '../utils/constants';
import './ClubManagement.css';

const ClubManagement = () => {
  const { events } = useData();
  const { showSuccess, showError } = useToast();

  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [selectedClub, setSelectedClub] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClub, setNewClub] = useState({
    name: '',
    category: '',
    description: '',
    president: '',
    contactEmail: '',
    contactPhone: ''
  });
  const [newClubErrors, setNewClubErrors] = useState({});

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setLoading(true);
        const response = await clubsAPI.getAll();
        if (response.success) {
          setClubs(response.data || []);
        } else {
          showError(response.message || 'Failed to load clubs');
        }
      } catch (err) {
        showError('Failed to load clubs');
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, [showError]);

  const filteredClubs = useMemo(() => {
    let filtered = clubs;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(org =>
        org.name?.toLowerCase().includes(search) ||
        org.description?.toLowerCase().includes(search) ||
        org.contact?.email?.toLowerCase().includes(search)
      );
    }

    // Sort by total events
    return filtered.sort((a, b) => getClubEvents(b._id).length - getClubEvents(a._id).length);
  }, [clubs, searchTerm]);

  const stats = useMemo(() => {
    const total = clubs.length;
    const totalEvents = events.filter(e => e.clubId).length;
    const totalFollowers = clubs.reduce((sum, club) => sum + (club.members?.length || 0), 0);
    
    return { total, totalEvents, totalFollowers };
  }, [clubs, events]);

  const handleViewDetails = (club) => {
    setSelectedClub(club);
    setShowDetailsModal(true);
  };

  const validateClub = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!newClub.name.trim()) errors.name = 'Club name is required';
    if (!newClub.category.trim()) errors.category = 'Category is required';
    if (!newClub.description.trim()) errors.description = 'Description is required';
    if (!newClub.president.trim()) errors.president = 'President name is required';
    if (!newClub.contactEmail.trim()) errors.contactEmail = 'Contact email is required';
    if (newClub.contactEmail && !emailRegex.test(newClub.contactEmail)) {
      errors.contactEmail = 'Enter a valid email';
    }

    setNewClubErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateClub = async () => {
    try {
      if (!validateClub()) {
        showError('Please fix the form errors');
        return;
      }

      setCreating(true);
      const payload = {
        name: newClub.name.trim(),
        category: newClub.category,
        description: newClub.description.trim(),
        president: newClub.president.trim(),
        contact: {
          email: newClub.contactEmail.trim(),
          phone: newClub.contactPhone.trim()
        }
      };

      const res = await clubsAPI.create(payload);
      if (res.success) {
        setClubs(prev => [...prev, res.data]);
        showSuccess('Club created successfully');
        setNewClub({
          name: '',
          category: '',
          description: '',
          president: '',
          contactEmail: '',
          contactPhone: ''
        });
        setNewClubErrors({});
        setShowCreateModal(false);
      } else {
        showError(res.message || 'Failed to create club');
      }
    } catch (err) {
      showError(err.message || 'Failed to create club');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClub = (clubId) => {
    if (window.confirm('Are you sure you want to delete this club? This action cannot be undone.')) {
      const clubEvents = events.filter(e => (e.clubId || e.clubId?._id) === clubId);
      if (clubEvents.length > 0) {
        showError(`Cannot delete club with ${clubEvents.length} associated events. Please remove events first.`);
        return;
      }
      clubsAPI.delete(clubId)
        .then(() => {
          setClubs(prev => prev.filter(c => c._id !== clubId));
          showSuccess('Club deleted successfully');
        })
        .catch(() => showError('Failed to delete club'));
    }
  };

  const getClubEvents = (clubId) => {
    return events.filter(e => (e.clubId || e.clubId?._id) === clubId);
  };

  return (
    <div className="club-management">
      <div className="page-header">
        <h1>Club Management</h1>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => {
              setShowCreateModal(true);
              setNewClubErrors({});
            }}
          >
            + Create Club
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total Clubs</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalEvents}</h3>
          <p>Total Events</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalFollowers}</h3>
          <p>Total Followers</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search clubs by name, email, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Clubs Table */}
      <div className="clubs-table-container">
        {loading ? (
          <div className="empty-state">
            <p>Loading clubs...</p>
          </div>
        ) : filteredClubs.length > 0 ? (
          <table className="clubs-table">
            <thead>
              <tr>
                <th>Club Name</th>
                <th>Category</th>
                <th>Contact</th>
                <th>Events</th>
                <th>Followers</th>
                <th>Upcoming</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClubs.map(club => {
                const clubEvents = getClubEvents(club._id);
                const upcomingEvents = clubEvents.filter(e => new Date(e.date) > new Date()).length;
                
                return (
                  <tr key={club._id}>
                    <td>
                      <div className="club-info">
                        <strong>{club.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">{club.category}</span>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div>{club.contact?.email || '-'}</div>
                        <div className="phone">{club.contact?.phone || '-'}</div>
                      </div>
                    </td>
                    <td className="number">{clubEvents.length}</td>
                    <td className="number">{club.members?.length || 0}</td>
                    <td className="number">{upcomingEvents}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleViewDetails(club)}
                          className="btn-view"
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleDeleteClub(club._id)}
                          className="btn-delete"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            {searchTerm ? (
              <>
                <p>No clubs found matching "{searchTerm}"</p>
                <button onClick={() => setSearchTerm('')} className="btn-secondary">
                  Clear Search
                </button>
              </>
            ) : (
              <p>No clubs registered yet</p>
            )}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedClub && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedClub.name}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Club Information</h3>
                <div className="detail-row">
                  <span className="label">Category:</span>
                  <span className="value">{selectedClub.category}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Description:</span>
                  <span className="value">{selectedClub.description}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email:</span>
                  <span className="value">{selectedClub.contact?.email || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Phone:</span>
                  <span className="value">{selectedClub.contact?.phone || '-'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Statistics</h3>
                <div className="stats-row">
                  <div className="stat-item">
                    <span className="stat-number">{getClubEvents(selectedClub._id).length}</span>
                    <span className="stat-label">Total Events</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">
                      {getClubEvents(selectedClub._id).filter(e => new Date(e.date) > new Date()).length}
                    </span>
                    <span className="stat-label">Upcoming Events</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{selectedClub.members?.length || 0}</span>
                    <span className="stat-label">Followers</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Recent Events</h3>
                <div className="events-list">
                  {getClubEvents(selectedClub._id).slice(0, 5).map(event => (
                    <div key={event._id || event.id} className="event-item">
                      <strong>{event.title}</strong>
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {getClubEvents(selectedClub._id).length === 0 && (
                    <p className="empty-message">No events yet</p>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowDetailsModal(false)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Club</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <label className="form-group">
                  Club Name *
                  <input
                    value={newClub.name}
                    onChange={e => {
                      setNewClub({ ...newClub, name: e.target.value });
                      setNewClubErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className={newClubErrors.name ? 'input-error' : ''}
                  />
                  {newClubErrors.name && <span className="error-text">{newClubErrors.name}</span>}
                </label>
                <label className="form-group">
                  Category *
                  <select
                    value={newClub.category}
                    onChange={e => {
                      setNewClub({ ...newClub, category: e.target.value });
                      setNewClubErrors(prev => ({ ...prev, category: '' }));
                    }}
                    className={newClubErrors.category ? 'input-error' : ''}
                  >
                    <option value="">Select</option>
                    {CLUB_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {newClubErrors.category && <span className="error-text">{newClubErrors.category}</span>}
                </label>
                <label className="form-group full-width">
                  Description *
                  <textarea
                    value={newClub.description}
                    onChange={e => {
                      setNewClub({ ...newClub, description: e.target.value });
                      setNewClubErrors(prev => ({ ...prev, description: '' }));
                    }}
                    className={newClubErrors.description ? 'input-error' : ''}
                  />
                  {newClubErrors.description && <span className="error-text">{newClubErrors.description}</span>}
                </label>
                <label className="form-group">
                  President *
                  <input
                    value={newClub.president}
                    onChange={e => {
                      setNewClub({ ...newClub, president: e.target.value });
                      setNewClubErrors(prev => ({ ...prev, president: '' }));
                    }}
                    className={newClubErrors.president ? 'input-error' : ''}
                  />
                  {newClubErrors.president && <span className="error-text">{newClubErrors.president}</span>}
                </label>
                <label className="form-group">
                  Contact Email *
                  <input
                    type="email"
                    value={newClub.contactEmail}
                    onChange={e => {
                      setNewClub({ ...newClub, contactEmail: e.target.value });
                      setNewClubErrors(prev => ({ ...prev, contactEmail: '' }));
                    }}
                    className={newClubErrors.contactEmail ? 'input-error' : ''}
                  />
                  {newClubErrors.contactEmail && <span className="error-text">{newClubErrors.contactEmail}</span>}
                </label>
                <label className="form-group">
                  Contact Phone
                  <input
                    value={newClub.contactPhone}
                    onChange={e => setNewClub({ ...newClub, contactPhone: e.target.value })}
                  />
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={creating} onClick={handleCreateClub}>
                {creating ? 'Creating...' : 'Create Club'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubManagement;
