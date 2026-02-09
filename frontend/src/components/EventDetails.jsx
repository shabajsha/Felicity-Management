import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';
import { formatDate, formatTime, getEventAvailability, getOrganizerName } from '../utils/helpers';
import { USER_ROLES, EVENT_TYPES } from '../utils/constants';
import { eventsAPI, registrationsAPI } from '../utils/api';
import TeamRegistrationForm from './TeamRegistrationForm.jsx';
import MerchandisePurchaseForm from './MerchandisePurchaseForm.jsx';
import './EventDetails.css';

function EventDetails({ onRegister, onDelete }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showMerchModal, setShowMerchModal] = useState(false);
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

  const capacity = event.capacity || event.maxParticipants || 0;
  const registered = event.registered || 0;
  const merchVariants = event.merchandise?.variants || [];
  const merchStock = merchVariants.length > 0
    ? merchVariants.reduce((sum, v) => sum + (v.stock || 0), 0)
    : (event.merchandise?.stock || 0);
  const isMerch = event.type === EVENT_TYPES.MERCHANDISE;
  const isFull = isMerch ? merchStock <= 0 : (registered >= capacity && capacity > 0);
  const isParticipant = user?.role === USER_ROLES.PARTICIPANT;
  const canManage = user?.role === USER_ROLES.ORGANIZER || user?.role === USER_ROLES.ADMIN;
  const availabilityStatus = getEventAvailability(event);
  const organizerDisplayName = getOrganizerName(event.organizer, event.organizerName);
  const deadlinePassed = event.registrationDeadline ? new Date(event.registrationDeadline) < new Date() : false;
  const isEligible = event.eligibility === 'All'
    || (event.eligibility === 'IIIT' && user?.participantType === 'IIIT')
    || (event.eligibility === 'Non-IIIT' && user?.participantType === 'Non-IIIT');

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
    
    if (deadlinePassed) {
      showError('Registration deadline has passed');
      return;
    }
    if (!isEligible) {
      showError('You are not eligible for this event');
      return;
    }

    if (isMerch) {
      setShowMerchModal(true);
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

  const handleMerchSubmit = async (payload) => {
    try {
      const response = await registrationsAPI.registerForEvent(event._id || event.id, payload);
      if (response.success) {
        showSuccess('Purchase successful! Ticket has been issued.');
        setShowMerchModal(false);
        const eventResponse = await eventsAPI.getEventById(id);
        if (eventResponse.success) {
          setEvent(eventResponse.data);
        }
        navigate('/dashboard');
      } else {
        showError(response.message || 'Failed to complete purchase');
      }
    } catch (err) {
      console.error('Error purchasing merchandise:', err);
      showError(err?.message || 'Failed to complete purchase');
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
              <div className="info-icon">📆</div>
              <div className="info-content">
                <span className="info-label">End Date</span>
                <span className="info-value">{formatDate(event.endDate || event.date)}</span>
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
                <span className="info-value">{isMerch ? `${merchStock} in stock` : `${capacity} people`}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon">✅</div>
              <div className="info-content">
                <span className="info-label">Eligibility</span>
                <span className="info-value">{event.eligibility || 'All'}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon">⏳</div>
              <div className="info-content">
                <span className="info-label">Registration Deadline</span>
                <span className="info-value">{formatDate(event.registrationDeadline || event.date)}</span>
              </div>
            </div>
          </div>

          <div className="description-section">
            <h3>About This Event</h3>
            <p className="event-description">{event.description}</p>
          </div>

          {isMerch && event.merchandise && (
            <div className="description-section">
              <h3>Merchandise Details</h3>
              <p>{event.merchandise.itemName}</p>
              {event.merchandise.description && <p>{event.merchandise.description}</p>}
              <p>Purchase Limit: {event.merchandise.purchaseLimit || 1}</p>
              {event.merchandise.sizes?.length > 0 && (
                <p>Sizes: {event.merchandise.sizes.join(', ')}</p>
              )}
              {event.merchandise.colors?.length > 0 && (
                <p>Colors: {event.merchandise.colors.join(', ')}</p>
              )}
            </div>
          )}

          <div className="registration-section">
            <h3>Registration Status</h3>
            <div className="progress-container">
              <div className="progress-bar-large">
                <div 
                  className={`progress-fill ${availabilityStatus.class}`}
                  style={{ width: `${capacity > 0 ? (registered / capacity) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="progress-info">
                <span className="registered-count">
                  <strong>{registered}</strong> registered
                </span>
                <span className="available-count">
                  <strong>{Math.max(capacity - registered, 0)}</strong> spots remaining
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
              disabled={isFull || deadlinePassed || !isEligible}
            >
              {isFull
                ? '✓ Sold Out'
                : deadlinePassed
                  ? 'Deadline Passed'
                  : (!isEligible ? 'Not Eligible' : (isMerch ? '🛍️ Purchase' : (event.allowTeams ? '👥 Register Team' : '✓ Register for This Event')))
              }
            </button>
          )}
          
          <div className="action-buttons">
            {user && (
              <>
                <Link to={`/forum/${event._id || event.id}`} className="btn btn-secondary">
                  💬 Discussion
                </Link>
                <Link to={`/feedback/${event._id || event.id}`} className="btn btn-secondary">
                  ⭐ Feedback
                </Link>
              </>
            )}
            {canManage && (
              <>
                <Link to={`/edit/${event._id || event.id}`} className="btn btn-secondary">
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

      {showMerchModal && (
        <div className="modal-overlay" onClick={() => setShowMerchModal(false)}>
          <div className="modal-content team-modal" onClick={e => e.stopPropagation()}>
            <MerchandisePurchaseForm
              event={event}
              onSubmit={handleMerchSubmit}
              onCancel={() => setShowMerchModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDetails;
