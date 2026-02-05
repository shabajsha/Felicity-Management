import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/helpers';
import './RegistrationManagement.css';

const RegistrationManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events, registrations, updateRegistration, users, organizers } = useData();
  const { showSuccess } = useToast();

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEventFilter, setSelectedEventFilter] = useState('all');

  // Get organizer's events
  const organizerEvents = useMemo(() => {
    if (!user?.organizerId) return [];
    return events.filter(e => e.organizerId === user.organizerId);
  }, [events, user]);

  const event = eventId ? events.find(e => e.id == eventId || e.id === parseInt(eventId)) : null;

  const eventRegistrations = useMemo(() => {
    if (eventId) {
      // Show registrations for specific event
      return registrations
        .filter(reg => reg.eventId == eventId || reg.eventId === parseInt(eventId))
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
    } else {
      // Show all registrations for organizer's events
      const organizerEventIds = organizerEvents.map(e => e.id);
      return registrations
        .filter(reg => organizerEventIds.includes(reg.eventId))
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
    }
  }, [registrations, eventId, organizerEvents]);

  const filteredRegistrations = useMemo(() => {
    let filtered = eventRegistrations;

    // Filter by event when showing all registrations
    if (!eventId && selectedEventFilter !== 'all') {
      filtered = filtered.filter(reg => reg.eventId == selectedEventFilter);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(reg => reg.status === filterStatus);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(reg =>
        (reg.participantName?.toLowerCase() || '').includes(search) ||
        (reg.email?.toLowerCase() || '').includes(search)
      );
    }

    return filtered;
  }, [eventRegistrations, filterStatus, searchTerm, selectedEventFilter, eventId]);

  const stats = useMemo(() => {
    const total = eventRegistrations.length;
    const pending = eventRegistrations.filter(r => r.status === 'pending').length;
    const approved = eventRegistrations.filter(r => r.status === 'approved').length;
    const rejected = eventRegistrations.filter(r => r.status === 'rejected').length;

    return { total, pending, approved, rejected };
  }, [eventRegistrations]);

  const handleApprove = (registrationId) => {
    updateRegistration(registrationId, { status: 'approved' });
    showSuccess('Registration approved successfully');
  };

  const handleReject = (registrationId) => {
    updateRegistration(registrationId, { status: 'rejected' });
    showSuccess('Registration rejected');
  };

  const handleViewDetails = (registration) => {
    setSelectedRegistration(registration);
    setShowDetailsModal(true);
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Status', 'Registered At', 'Custom Fields'].join(','),
      ...filteredRegistrations.map(reg => [
        reg.participantName,
        reg.email,
        reg.phone || '',
        reg.status,
        new Date(reg.registeredAt).toLocaleString(),
        JSON.stringify(reg.customFieldResponses || {})
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '_')}_registrations.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSuccess('Registration data exported successfully');
  };

  if (eventId && !event) {
    return (
      <div className="registration-management">
        <div className="error-state">
          <h2>Event Not Found</h2>
          <button onClick={() => navigate('/organizer/events')} className="btn-primary">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-management">
      <div className="page-header">
        <div>
          {eventId && (
            <button onClick={() => navigate(-1)} className="back-button">
              ← Back
            </button>
          )}
          <h1>{event ? event.title : 'All Registrations'}</h1>
          {event && (
            <p className="event-info">
              {formatDate(event.date)} • {event.location}
            </p>
          )}
        </div>
        <button onClick={handleExport} className="btn-export">
          📥 Export Data
        </button>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total Registrations</p>
        </div>
        <div className="stat-card pending">
          <h3>{stats.pending}</h3>
          <p>Pending Approval</p>
        </div>
        <div className="stat-card approved">
          <h3>{stats.approved}</h3>
          <p>Approved</p>
        </div>
        <div className="stat-card rejected">
          <h3>{stats.rejected}</h3>
          <p>Rejected</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {!eventId && organizerEvents.length > 0 && (
          <div className="event-filter">
            <label>Filter by Event:</label>
            <select value={selectedEventFilter} onChange={(e) => setSelectedEventFilter(e.target.value)}>
              <option value="all">All Events</option>
              {organizerEvents.map(evt => (
                <option key={evt.id} value={evt.id}>{evt.title}</option>
              ))}
            </select>
          </div>
        )}
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({stats.total})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            Pending ({stats.pending})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'approved' ? 'active' : ''}`}
            onClick={() => setFilterStatus('approved')}
          >
            Approved ({stats.approved})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilterStatus('rejected')}
          >
            Rejected ({stats.rejected})
          </button>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="registrations-table-container">
        {filteredRegistrations.length > 0 ? (
          <table className="registrations-table">
            <thead>
              <tr>
                <th>Participant</th>
                {!eventId && <th>Event</th>}
                <th>Email</th>
                <th>Phone</th>
                <th>Registered</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map(registration => {
                const regEvent = events.find(e => e.id === registration.eventId);
                return (
                  <tr key={registration.id}>
                    <td>
                      <div className="participant-info">
                        <strong>{registration.participantName}</strong>
                        {registration.isTeam && (
                          <span className="team-badge">Team</span>
                        )}
                      </div>
                    </td>
                    {!eventId && <td>{regEvent?.title || 'Unknown Event'}</td>}
                    <td>{registration.email}</td>
                    <td>{registration.phone || '-'}</td>
                  <td>{formatDate(registration.registeredAt)}</td>
                  <td>
                    <span className={`status-badge ${registration.status}`}>
                      {registration.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleViewDetails(registration)}
                        className="btn-view"
                        title="View Details"
                      >
                        👁️
                      </button>
                      {registration.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(registration.id)}
                            className="btn-approve"
                            title="Approve"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleReject(registration.id)}
                            className="btn-reject"
                            title="Reject"
                          >
                            ✕
                          </button>
                        </>
                      )}
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
                <p>No registrations found matching "{searchTerm}"</p>
                <button onClick={() => setSearchTerm('')} className="btn-secondary">
                  Clear Search
                </button>
              </>
            ) : (
              <p>No {filterStatus !== 'all' ? filterStatus : ''} registrations yet</p>
            )}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRegistration && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registration Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Participant Information</h3>
                <div className="detail-row">
                  <span className="label">Name:</span>
                  <span className="value">{selectedRegistration.participantName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email:</span>
                  <span className="value">{selectedRegistration.email}</span>
                </div>
                {selectedRegistration.phone && (
                  <div className="detail-row">
                    <span className="label">Phone:</span>
                    <span className="value">{selectedRegistration.phone}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Registered:</span>
                  <span className="value">{formatDate(selectedRegistration.registeredAt)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Status:</span>
                  <span className={`status-badge ${selectedRegistration.status}`}>
                    {selectedRegistration.status}
                  </span>
                </div>
              </div>

              {selectedRegistration.isTeam && selectedRegistration.teamMembers && (
                <div className="detail-section">
                  <h3>Team Members</h3>
                  {selectedRegistration.teamMembers.map((member, index) => (
                    <div key={index} className="team-member">
                      <strong>{member.name}</strong>
                      <span>{member.email}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedRegistration.customFieldResponses &&
                Object.keys(selectedRegistration.customFieldResponses).length > 0 && (
                  <div className="detail-section">
                    <h3>Additional Information</h3>
                    {Object.entries(selectedRegistration.customFieldResponses).map(
                      ([fieldId, value]) => {
                        const field = event.customFields?.find(f => f.id === fieldId);
                        return (
                          <div key={fieldId} className="detail-row">
                            <span className="label">{field?.label || fieldId}:</span>
                            <span className="value">
                              {Array.isArray(value) ? value.join(', ') : value}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
            </div>

            <div className="modal-actions">
              {selectedRegistration.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      handleApprove(selectedRegistration.id);
                      setShowDetailsModal(false);
                    }}
                    className="btn-primary"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedRegistration.id);
                      setShowDetailsModal(false);
                    }}
                    className="btn-danger"
                  >
                    Reject
                  </button>
                </>
              )}
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

export default RegistrationManagement;
