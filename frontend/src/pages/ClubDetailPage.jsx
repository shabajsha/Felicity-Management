import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { formatDateShort } from '../utils/helpers';
import './ClubDetailPage.css';

function ClubDetailPage() {
  const { id } = useParams();
  const { organizers, events } = useData();
  const { user, login } = useAuth();
  const { showSuccess } = useToast();

  const organizer = organizers.find(org => org.id === parseInt(id) || org.id === id);
  const followedClubs = user?.followedClubs || [];
  const isFollowing = followedClubs.includes(organizer?.id);

  if (!organizer) {
    return (
      <div className="club-detail-page">
        <div className="not-found">
          <h2>Club Not Found</h2>
          <p>Sorry, we couldn't find the club you're looking for.</p>
          <Link to="/clubs" className="btn btn-primary">Back to Clubs</Link>
        </div>
      </div>
    );
  }

  const organizerEvents = events.filter(e => e.organizerId === organizer.id);
  const upcomingEvents = organizerEvents.filter(e => new Date(e.date) >= new Date());
  const pastEvents = organizerEvents.filter(e => new Date(e.date) < new Date());

  const handleFollowToggle = () => {
    if (!user) return;

    const updatedClubs = isFollowing
      ? followedClubs.filter(id => id !== organizer.id)
      : [...followedClubs, organizer.id];

    const updatedUser = { ...user, followedClubs: updatedClubs };
    login(updatedUser);

    showSuccess(isFollowing ? 'Unfollowed club' : 'Following club');
  };

  return (
    <div className="club-detail-page">
      <div className="club-detail-header">
        <div className="club-header-content">
          <div className="club-avatar-large">
            {organizer.name.charAt(0).toUpperCase()}
          </div>
          <div className="club-info">
            <div className="club-category-badge">{organizer.category}</div>
            <h1>{organizer.name}</h1>
            <p className="club-description">{organizer.description}</p>
            <div className="club-meta">
              <div className="meta-item">
                <span className="meta-icon">👥</span>
                <span>{organizer.followers} followers</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon">📅</span>
                <span>{organizer.totalEvents} total events</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon">📧</span>
                <span>{organizer.contactEmail}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="club-actions">
          <button
            className={`btn btn-large ${isFollowing ? 'btn-following' : 'btn-primary'}`}
            onClick={handleFollowToggle}
          >
            {isFollowing ? '✓ Following' : '+ Follow Club'}
          </button>
        </div>
      </div>

      <div className="club-detail-content">
        <div className="events-section">
          <h2>Upcoming Events ({upcomingEvents.length})</h2>
          {upcomingEvents.length === 0 ? (
            <div className="empty-message">
              <p>No upcoming events scheduled</p>
            </div>
          ) : (
            <div className="events-list">
              {upcomingEvents.map(event => (
                <Link key={event.id} to={`/event/${event.id}`} className="event-item">
                  <div className="event-date">
                    <div className="date-day">{new Date(event.date).getDate()}</div>
                    <div className="date-month">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  <div className="event-info">
                    <h3>{event.title}</h3>
                    <div className="event-meta-row">
                      <span>⏰ {event.time}</span>
                      <span>📍 {event.location}</span>
                      <span>👥 {event.registered}/{event.capacity}</span>
                    </div>
                  </div>
                  <div className="event-arrow">→</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="events-section">
          <h2>Past Events ({pastEvents.length})</h2>
          {pastEvents.length === 0 ? (
            <div className="empty-message">
              <p>No past events</p>
            </div>
          ) : (
            <div className="events-list">
              {pastEvents.slice(0, 10).map(event => (
                <Link key={event.id} to={`/event/${event.id}`} className="event-item past">
                  <div className="event-date">
                    <div className="date-day">{new Date(event.date).getDate()}</div>
                    <div className="date-month">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  <div className="event-info">
                    <h3>{event.title}</h3>
                    <div className="event-meta-row">
                      <span>📅 {formatDateShort(event.date)}</span>
                      <span>👥 {event.registered} attended</span>
                    </div>
                  </div>
                  <div className="event-arrow">→</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="back-link">
        <Link to="/clubs" className="btn btn-outline">← Back to All Clubs</Link>
      </div>
    </div>
  );
}

export default ClubDetailPage;
