import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';
import './ClubManagement.css';

const ClubManagement = () => {
  const { organizers, events, updateOrganizer, deleteOrganizer } = useData();
  const { showSuccess, showError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [selectedClub, setSelectedClub] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const filteredOrganizers = useMemo(() => {
    let filtered = organizers;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(search) ||
        org.description.toLowerCase().includes(search) ||
        org.contactEmail.toLowerCase().includes(search)
      );
    }

    // Sort by total events
    return filtered.sort((a, b) => (b.totalEvents || 0) - (a.totalEvents || 0));
  }, [organizers, searchTerm]);

  const stats = useMemo(() => {
    const total = organizers.length;
    const totalEvents = organizers.reduce((sum, org) => sum + (org.totalEvents || 0), 0);
    const totalFollowers = organizers.reduce((sum, org) => sum + (org.followers || 0), 0);
    
    return { total, totalEvents, totalFollowers };
  }, [organizers]);

  const handleViewDetails = (club) => {
    setSelectedClub(club);
    setShowDetailsModal(true);
  };

  const handleToggleStatus = (clubId) => {
    const club = organizers.find(o => o.id === clubId);
    const newStatus = !club.isActive;
    updateOrganizer(clubId, { isActive: newStatus });
    showSuccess(`Club ${newStatus ? 'activated' : 'deactivated'} successfully`);
  };

  const handleDeleteClub = (clubId) => {
    if (window.confirm('Are you sure you want to delete this club? This action cannot be undone.')) {
      const clubEvents = events.filter(e => e.organizerId === clubId);
      if (clubEvents.length > 0) {
        showError(`Cannot delete club with ${clubEvents.length} associated events. Please remove events first.`);
        return;
      }
      deleteOrganizer(clubId);
      showSuccess('Club deleted successfully');
    }
  };

  const getClubEvents = (clubId) => {
    return events.filter(e => e.organizerId === clubId);
  };

  return (
    <div className="club-management">
      <div className="page-header">
        <h1>Club Management</h1>
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
        {filteredOrganizers.length > 0 ? (
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
              {filteredOrganizers.map(club => {
                const clubEvents = getClubEvents(club.id);
                const upcomingEvents = clubEvents.filter(e => new Date(e.date) > new Date()).length;
                
                return (
                  <tr key={club.id}>
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
                        <div>{club.contactEmail}</div>
                        <div className="phone">{club.contactNumber}</div>
                      </div>
                    </td>
                    <td className="number">{clubEvents.length}</td>
                    <td className="number">{club.followers || 0}</td>
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
                          onClick={() => handleDeleteClub(club.id)}
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
                  <span className="value">{selectedClub.contactEmail}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Phone:</span>
                  <span className="value">{selectedClub.contactNumber}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Statistics</h3>
                <div className="stats-row">
                  <div className="stat-item">
                    <span className="stat-number">{selectedClub.totalEvents || 0}</span>
                    <span className="stat-label">Total Events</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{selectedClub.upcomingEvents || 0}</span>
                    <span className="stat-label">Upcoming Events</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{selectedClub.followers || 0}</span>
                    <span className="stat-label">Followers</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Recent Events</h3>
                <div className="events-list">
                  {getClubEvents(selectedClub.id).slice(0, 5).map(event => (
                    <div key={event.id} className="event-item">
                      <strong>{event.title}</strong>
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {getClubEvents(selectedClub.id).length === 0 && (
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
    </div>
  );
};

export default ClubManagement;
