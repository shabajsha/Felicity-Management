import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { registrationsAPI } from '../utils/api';
import { formatDate } from '../utils/helpers';
import './RegistrationManagement.css';

const RegistrationManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events } = useData();
  const { showSuccess, showError } = useToast();

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEventFilter, setSelectedEventFilter] = useState('all');

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        setLoading(true);
        const response = eventId
          ? await registrationsAPI.getEventRegistrations(eventId)
          : await registrationsAPI.getOrganizerRegistrations();

        if (response.success) {
          const data = response.data || response.registrations || [];
          setRegistrations(data);
        } else {
          showError(response.message || 'Failed to load registrations');
        }
      } catch (err) {
        console.error('Error fetching registrations:', err);
        showError('Failed to load registrations');
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, [eventId]);

  // Get organizer's events
  const organizerEvents = useMemo(() => {
    if (!user?._id && !user?.id) return [];
    return events.filter(e => {
      const organizerId = e.organizer?._id || e.organizer || e.organizerId;
      return organizerId === user._id || organizerId === user.id;
    });
  }, [events, user]);

  const event = eventId ? events.find(e => e.id == eventId || e._id == eventId) : null;

  const eventRegistrations = useMemo(() => {
    return registrations
      .slice()
      .sort((a, b) => new Date(b.registeredAt || b.createdAt) - new Date(a.registeredAt || a.createdAt));
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    let filtered = eventRegistrations;

    // Filter by event when showing all registrations
    if (!eventId && selectedEventFilter !== 'all') {
      filtered = filtered.filter(reg => {
        const regEventId = reg.event?._id || reg.eventId || reg.event;
        return regEventId == selectedEventFilter;
      });
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
    const confirmed = eventRegistrations.filter(r => r.status === 'confirmed' || r.status === 'approved').length;
    const rejected = eventRegistrations.filter(r => r.status === 'rejected').length;

    return { total, pending, confirmed, rejected };
  }, [eventRegistrations]);

  const handleApprove = async (registrationId) => {
    try {
      const response = await registrationsAPI.updateRegistrationStatus(registrationId, 'confirmed');
      if (response.success) {
        const updated = response.data || response.registration;
        setRegistrations(prev =>
          prev.map(reg => (reg._id === registrationId || reg.id === registrationId ? updated : reg))
        );
        showSuccess('Registration confirmed successfully');
      } else {
        showError(response.message || 'Failed to confirm registration');
      }
    } catch (err) {
      console.error('Error confirming registration:', err);
      showError('Failed to confirm registration');
    }
  };

  const handleReject = async (registrationId) => {
    try {
      const response = await registrationsAPI.updateRegistrationStatus(registrationId, 'rejected');
      if (response.success) {
        const updated = response.data || response.registration;
        setRegistrations(prev =>
          prev.map(reg => (reg._id === registrationId || reg.id === registrationId ? updated : reg))
        );
        showSuccess('Registration rejected');
      } else {
        showError(response.message || 'Failed to reject registration');
      }
    } catch (err) {
      console.error('Error rejecting registration:', err);
      showError('Failed to reject registration');
    }
  };

  const handleViewDetails = (registration) => {
    setSelectedRegistration(registration);
    setShowDetailsModal(true);
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Status', 'Registered At', 'Event', 'Custom Fields'].join(','),
      ...filteredRegistrations.map(reg => [
        reg.participantName,
        reg.email,
        reg.phone || '',
        reg.status,
        new Date(reg.registeredAt || reg.createdAt).toLocaleString(),
        reg.event?.title || '',
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
        <div className="stat-card confirmed">
          <h3>{stats.confirmed}</h3>
          <p>Confirmed</p>
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
            className={`filter-btn ${filterStatus === 'confirmed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('confirmed')}
          >
            Confirmed ({stats.confirmed})
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
                const regEvent = registration.event || events.find(e => e.id === registration.eventId || e.id === registration.event);
                return (
                  <tr key={registration._id || registration.id}>
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
                  <td>{formatDate(registration.registeredAt || registration.createdAt)}</td>
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
                            onClick={() => handleApprove(registration._id || registration.id)}
                            className="btn-approve"
                            title="Approve"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleReject(registration._id || registration.id)}
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
