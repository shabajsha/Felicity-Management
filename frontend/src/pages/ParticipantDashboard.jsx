import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDateShort, formatTime, getDaysUntilEvent } from '../utils/helpers';
import { REGISTRATION_STATUS, EVENT_TYPES } from '../utils/constants';
import './ParticipantDashboard.css';

function ParticipantDashboard() {
  const { user } = useAuth();
  const { events, registrations } = useData();
  const [activeTab, setActiveTab] = useState('upcoming');

  const userRegistrations = useMemo(() => {
    return registrations.filter(reg => reg.userId === user?.id);
  }, [registrations, user]);

  const upcomingEvents = useMemo(() => {
    return userRegistrations
      .filter(reg => {
        const event = events.find(e => e.id === reg.eventId);
        return event && new Date(event.date) >= new Date() && reg.status === REGISTRATION_STATUS.CONFIRMED;
      })
      .map(reg => ({
        ...reg,
        event: events.find(e => e.id === reg.eventId)
      }))
      .sort((a, b) => new Date(a.event.date) - new Date(b.event.date));
  }, [userRegistrations, events]);

  const categorizedRegistrations = useMemo(() => {
    const normal = [];
    const merchandise = [];
    const completed = [];
    const cancelled = [];

    userRegistrations.forEach(reg => {
      const event = events.find(e => e.id === reg.eventId);
      if (!event) return;

      const registration = { ...reg, event };

      if (reg.status === REGISTRATION_STATUS.CANCELLED || reg.status === REGISTRATION_STATUS.REJECTED) {
        cancelled.push(registration);
      } else if (new Date(event.date) < new Date() || reg.status === REGISTRATION_STATUS.COMPLETED) {
        completed.push(registration);
      } else if (event.type === EVENT_TYPES.MERCHANDISE) {
        merchandise.push(registration);
      } else {
        normal.push(registration);
      }
    });

    return { normal, merchandise, completed, cancelled };
  }, [userRegistrations, events]);

  const stats = {
    total: upcomingEvents.length,
    thisWeek: upcomingEvents.filter(e => getDaysUntilEvent(e.event.date) <= 7).length,
    thisMonth: upcomingEvents.filter(e => getDaysUntilEvent(e.event.date) <= 30).length,
  };

  const renderEventCard = (registration) => {
    const { event } = registration;
    const daysUntil = getDaysUntilEvent(event.date);

    return (
      <div key={registration.id} className="dashboard-event-card">
        <div className="event-card-left">
          <div className="event-date-badge">
            <div className="date-day">{new Date(event.date).getDate()}</div>
            <div className="date-month">
              {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
            </div>
          </div>
        </div>
        <div className="event-card-content">
          <div className="event-card-header">
            <div>
              <Link to={`/event/${event.id}`} className="event-title-link">
                <h3>{event.title}</h3>
              </Link>
              <p className="event-organizer">{event.organizer}</p>
            </div>
            <div className="event-badges">
              {event.type === EVENT_TYPES.MERCHANDISE && (
                <span className="badge badge-merchandise">Merchandise</span>
              )}
              <span className={`badge badge-${registration.status.toLowerCase()}`}>
                {registration.status}
              </span>
            </div>
          </div>
          <div className="event-meta">
            <span>⏰ {formatTime(event.time)}</span>
            <span>📍 {event.location}</span>
            {daysUntil >= 0 && (
              <span className="days-until">
                {daysUntil === 0 ? '🔥 Today!' : `📅 ${daysUntil} days`}
              </span>
            )}
          </div>
          <div className="event-ticket-info">
            <span className="ticket-id">Ticket: {registration.ticketId}</span>
            <Link to={`/event/${event.id}`} className="view-details-link">
              View Details →
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="participant-dashboard">
      <div className="dashboard-header">
        <h1>My Dashboard</h1>
        <p className="subtitle">Welcome back, {user?.firstName}! Track your events and registrations</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎫</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Upcoming Events</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.thisWeek}</div>
            <div className="stat-label">This Week</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.thisMonth}</div>
            <div className="stat-label">This Month</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-value">{categorizedRegistrations.completed.length}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Upcoming Events</h2>
        {upcomingEvents.length === 0 ? (
          <div className="empty-state">
            <p>📭 No upcoming events registered</p>
            <Link to="/events" className="btn btn-primary">Browse Events</Link>
          </div>
        ) : (
          <div className="events-list">
            {upcomingEvents.map(renderEventCard)}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h2>Participation History</h2>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Normal ({categorizedRegistrations.normal.length})
          </button>
          <button
            className={`tab ${activeTab === 'merchandise' ? 'active' : ''}`}
            onClick={() => setActiveTab('merchandise')}
          >
            Merchandise ({categorizedRegistrations.merchandise.length})
          </button>
          <button
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({categorizedRegistrations.completed.length})
          </button>
          <button
            className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled ({categorizedRegistrations.cancelled.length})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'upcoming' && (
            <div className="events-list">
              {categorizedRegistrations.normal.length === 0 ? (
                <p className="empty-message">No normal events registered</p>
              ) : (
                categorizedRegistrations.normal.map(renderEventCard)
              )}
            </div>
          )}
          {activeTab === 'merchandise' && (
            <div className="events-list">
              {categorizedRegistrations.merchandise.length === 0 ? (
                <p className="empty-message">No merchandise orders</p>
              ) : (
                categorizedRegistrations.merchandise.map(renderEventCard)
              )}
            </div>
          )}
          {activeTab === 'completed' && (
            <div className="events-list">
              {categorizedRegistrations.completed.length === 0 ? (
                <p className="empty-message">No completed events</p>
              ) : (
                categorizedRegistrations.completed.map(renderEventCard)
              )}
            </div>
          )}
          {activeTab === 'cancelled' && (
            <div className="events-list">
              {categorizedRegistrations.cancelled.length === 0 ? (
                <p className="empty-message">No cancelled registrations</p>
              ) : (
                categorizedRegistrations.cancelled.map(renderEventCard)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ParticipantDashboard;
