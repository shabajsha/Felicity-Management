import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './EventCard.css';

function EventCard({ event, onDelete, onRegister }) {
  const { user } = useAuth();
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getAvailability = () => {
    const available = event.capacity - event.registered;
    const percentage = (event.registered / event.capacity) * 100;
    
    if (percentage >= 90) return 'almost-full';
    if (percentage >= 70) return 'filling-up';
    return 'available';
  };

  const isFull = event.registered >= event.capacity;
  const isParticipant = user?.role === 'Participant';
  const canManage = user?.role === 'Organizer' || user?.role === 'Admin';

  return (
    <div className="event-card">
      <div className="event-card-header">
        <span className={`category-badge ${event.category.toLowerCase().replace(/\s/g, '-')}`}>
          {event.category}
        </span>
        <span className={`availability-badge ${getAvailability()}`}>
          {event.capacity - event.registered} spots left
        </span>
      </div>

      <div className="event-card-body">
        <h3 className="event-title">
          <Link to={`/event/${event.id}`}>{event.title}</Link>
        </h3>
        
        <div className="event-meta">
          <div className="meta-item">
            <span className="icon">📅</span>
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="meta-item">
            <span className="icon">⏰</span>
            <span>{event.time}</span>
          </div>
          <div className="meta-item">
            <span className="icon">📍</span>
            <span>{event.location}</span>
          </div>
        </div>

        <p className="event-description">
          {event.description.length > 120 
            ? `${event.description.substring(0, 120)}...` 
            : event.description}
        </p>

        <div className="event-organizer">
          <span className="icon">👤</span>
          <span>{event.organizer}</span>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className={`progress-fill ${getAvailability()}`}
              style={{ width: `${(event.registered / event.capacity) * 100}%` }}
            ></div>
          </div>
          <span className="progress-text">
            {event.registered} / {event.capacity} registered
          </span>
        </div>
      </div>

      <div className="event-card-footer">
        {isParticipant && (
          <button 
            className="btn btn-primary"
            onClick={() => onRegister(event.id)}
            disabled={isFull}
          >
            {isFull ? '✓ Full' : '✓ Register'}
          </button>
        )}
        {canManage && (
          <div className="action-buttons">
            <Link to={`/edit/${event.id}`} className="btn btn-secondary">
              ✏️ Edit
            </Link>
            <button 
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this event?')) {
                  onDelete(event.id);
                }
              }}
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventCard;
