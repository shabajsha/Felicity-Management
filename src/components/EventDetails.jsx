import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { formatDate, formatTime, getEventAvailability } from '../utils/helpers';
import { USER_ROLES, EVENT_TYPES } from '../utils/constants';
import './EventDetails.css';

function EventDetails({ onRegister, onDelete }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events } = useData();
  
  const event = events.find(e => e.id === parseInt(id) || e.id === id.toString());

  if (!event) {
    return (
      <div className="event-details-container">
        <div className="not-found">
          <h2>Event Not Found</h2>
          <p>Sorry, we couldn't find the event you're looking for.</p>
          <Link to="/" className="btn btn-primary">Back to Events</Link>
        </div>
      </div>
    );
  }

  const isFull = event.registered >= event.capacity;
  const isParticipant = user?.role === USER_ROLES.PARTICIPANT;
  const canManage = user?.role === USER_ROLES.ORGANIZER || user?.role === USER_ROLES.ADMIN;
  const availabilityStatus = getEventAvailability(event);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      onDelete(event.id);
      navigate('/');
    }
  };

  const handleRegister = () => {
    onRegister(event.id);
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
            Organized by <strong>{event.organizer}</strong>
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
              {isFull ? '✓ Event Full' : '✓ Register for This Event'}
            </button>
          )}
          
          <div className="action-buttons">
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
    </div>
  );
}

export default EventDetails;
