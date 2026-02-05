import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDateShort, getEventAvailability, formatTime } from '../utils/helpers';
import { EVENT_TYPES, USER_ROLES } from '../utils/constants';
import './EventCard.css';

function EventCard({ event, onDelete, onRegister }) {
  const { user } = useAuth();

  const availabilityStatus = getEventAvailability(event);
  const isFull = event.registered >= event.capacity;
  const isParticipant = user?.role === USER_ROLES.PARTICIPANT;
  const canManage = user?.role === USER_ROLES.ORGANIZER || user?.role === USER_ROLES.ADMIN;

  return (
    <div className="event-card">
      <div className="event-card-header">
        <span className={`category-badge ${event.category ? event.category.toLowerCase().replace(/\s/g, '-') : 'default'}`}>
          {event.category || 'Uncategorized'}
        </span>
        <div className="badges">
          {event.type === EVENT_TYPES.MERCHANDISE && (
            <span className="type-badge merchandise">🛍️ Merch</span>
          )}
          <span className={`availability-badge ${availabilityStatus.class}`}>
            {availabilityStatus.available} spots left
          </span>
        </div>
      </div>

      <div className="event-card-body">
        <h3 className="event-title">
          <Link to={`/event/${event.id}`}>{event.title}</Link>
        </h3>
        
        <div className="event-meta">
          <div className="meta-item">
            <span className="icon">📅</span>
            <span>{formatDateShort(event.date)}</span>
          </div>
          <div className="meta-item">
            <span className="icon">⏰</span>
            <span>{formatTime(event.time)}</span>
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
              className={`progress-fill ${availabilityStatus.class}`}
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
            <Link to={`/organizer/events/edit/${event.id}`} className="btn btn-secondary">
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
