import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './EventDetails.css';

function EventDetails({ events, onRegister, onDelete }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const event = events.find(e => e.id === parseInt(id));

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getAvailabilityStatus = () => {
    const available = event.capacity - event.registered;
    const percentage = (event.registered / event.capacity) * 100;
    
    if (percentage >= 90) return { text: 'Almost Full!', class: 'almost-full' };
    if (percentage >= 70) return { text: 'Filling Up Fast', class: 'filling-up' };
    return { text: 'Available', class: 'available' };
  };

  const isFull = event.registered >= event.capacity;
  const isParticipant = user?.role === 'Participant';
  const canManage = user?.role === 'Organizer' || user?.role === 'Admin';
  const availabilityStatus = getAvailabilityStatus();

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
            <span className={`category-badge ${event.category.toLowerCase().replace(/\s/g, '-')}`}>
              {event.category}
            </span>
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
