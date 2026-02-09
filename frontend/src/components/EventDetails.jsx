import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';
import { formatDate, formatTime, getEventAvailability, getOrganizerName } from '../utils/helpers';
import { USER_ROLES, EVENT_TYPES } from '../utils/constants';
import { eventsAPI, registrationsAPI } from '../utils/api';
import TeamRegistrationForm from './TeamRegistrationForm.jsx';
import './EventDetails.css';

function EventDetails({ onRegister, onDelete }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await eventsAPI.getEventById(id);
        if (response.success) {
          setEvent(response.data);
        } else {
          setError(response.message || 'Event not found');
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="event-details-container">
        <div className="loading">
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-details-container">
        <div className="not-found">
          <h2>Event Not Found</h2>
          <p>{error || "Sorry, we couldn't find the event you're looking for."}</p>
          <Link to="/" className="btn btn-primary">Back to Events</Link>
        </div>
      </div>
    );
  }

  const isFull = event.registered >= event.capacity;
  const isParticipant = user?.role === USER_ROLES.PARTICIPANT;
  const canManage = user?.role === USER_ROLES.ORGANIZER || user?.role === USER_ROLES.ADMIN;
  const availabilityStatus = getEventAvailability(event);
  const organizerDisplayName = getOrganizerName(event.organizer, event.organizerName);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        const response = await eventsAPI.deleteEvent(event._id || event.id);
        if (response.success) {
          showSuccess('Event deleted successfully');
          navigate('/');
        } else {
          showError(response.message || 'Failed to delete event');
        }
      } catch (err) {
        console.error('Error deleting event:', err);
        showError('Failed to delete event');
      }
    }
  };

  const handleRegister = async () => {
    console.log('handleRegister called', { allowTeams: event.allowTeams });
    
    if (!user) {
      showError('Please login to register');
      return;
    }
    
    if (event.allowTeams) {
      console.log('Opening team modal');
      setShowTeamModal(true);
    } else {
      try {
        const response = await registrationsAPI.registerForEvent(event._id || event.id);
        if (response.success) {
          showSuccess('Successfully registered for event!');
          // Refresh event data to show updated registration count
          const eventResponse = await eventsAPI.getEventById(id);
          if (eventResponse.success) {
            setEvent(eventResponse.data);
          }
        } else {
          showError(response.message || 'Failed to register for event');
        }
      } catch (err) {
        console.error('Error registering for event:', err);
        showError(err?.message || 'Failed to register for event');
      }
    }
  };

  const handleTeamSubmit = async (teamData) => {
    try {
      const response = await registrationsAPI.registerForEvent(event._id || event.id, teamData);
      if (response.success) {
        showSuccess('Team registered successfully!');
        setShowTeamModal(false);
        // Refresh event data
        const eventResponse = await eventsAPI.getEventById(id);
        if (eventResponse.success) {
          setEvent(eventResponse.data);
        }
        navigate('/dashboard');
      } else {
        showError(response.message || 'Failed to register team');
      }
    } catch (err) {
      console.error('Error registering team:', err);
      showError(err?.message || 'Failed to register team');
    }
  };

  return (
    <div className="event-details-container">
      <div className="details-card">
        <div className="details-header">
          <div className="header-top">
            <div className="badges-group">
              <span className={`category-badge ${event.category ? event.category.toLowerCase().replace(/\s/g, '-') : 'default'}`}>
                {event.category || 'Uncategorized'}
              </span>
              {event.type === EVENT_TYPES.MERCHANDISE && (
                <span className="type-badge merchandise">🛍️ Merchandise</span>
              )}
            </div>
            <span className={`status-badge ${availabilityStatus.class}`}>
              {availabilityStatus.text}
            </span>
          </div>
          <h1 className="event-title">{event.title}</h1>
          <p className="event-organizer">
            <span className="icon">👤</span>
            Organized by <strong>{organizerDisplayName}</strong>
          </p>
        </div>

        <div className="details-body">
          <div className="info-grid">
            <div className="info-item">
              <div className="info-icon">📅</div>
              <div className="info-content">
                <span className="info-label">Date</span>
                <span className="info-value">{formatDate(event.date)}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">⏰</div>
              <div className="info-content">
                <span className="info-label">Time</span>
                <span className="info-value">{formatTime(event.time)}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">📍</div>
              <div className="info-content">
                <span className="info-label">Location</span>
                <span className="info-value">{event.location}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">👥</div>
              <div className="info-content">
                <span className="info-label">Capacity</span>
                <span className="info-value">{event.capacity} people</span>
              </div>
            </div>
          </div>

          <div className="description-section">
            <h3>About This Event</h3>
            <p className="event-description">{event.description}</p>
          </div>

          <div className="registration-section">
            <h3>Registration Status</h3>
            <div className="progress-container">
              <div className="progress-bar-large">
                <div 
                  className={`progress-fill ${availabilityStatus.class}`}
                  style={{ width: `${(event.registered / event.capacity) * 100}%` }}
                ></div>
              </div>
              <div className="progress-info">
                <span className="registered-count">
                  <strong>{event.registered}</strong> registered
                </span>
                <span className="available-count">
                  <strong>{event.capacity - event.registered}</strong> spots remaining
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="details-footer">
          {isParticipant && (
            <button 
              className="btn btn-primary btn-large"
              onClick={handleRegister}
              disabled={isFull}
            >
              {isFull ? '✓ Event Full' : event.allowTeams ? '👥 Register Team' : '✓ Register for This Event'}
            </button>
          )}
          
          <div className="action-buttons">
            {user && (
              <>
                <Link to={`/forum/${event.id}`} className="btn btn-secondary">
                  💬 Discussion
                </Link>
                <Link to={`/feedback/${event.id}`} className="btn btn-secondary">
                  ⭐ Feedback
                </Link>
              </>
            )}
            {canManage && (
              <>
                <Link to={`/edit/${event.id}`} className="btn btn-secondary">
                  ✏️ Edit Event
                </Link>
                <button onClick={handleDelete} className="btn btn-danger">
                  🗑️ Delete Event
                </button>
              </>
            )}
            <Link to="/" className="btn btn-outline">
              ← Back to Events
            </Link>
          </div>
        </div>
      </div>

      {/* Team Registration Modal */}
      {showTeamModal && (
        <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
          <div className="modal-content team-modal" onClick={e => e.stopPropagation()}>
            <TeamRegistrationForm 
              event={event}
              onSubmit={handleTeamSubmit}
              onCancel={() => setShowTeamModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDetails;
