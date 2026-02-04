import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDate, getEventStatus } from '../utils/helpers';
import { EVENT_STATUS } from '../utils/constants';
import './OrganizerDashboard.css';

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const { events, registrations, organizers } = useData();
  const [activeTab, setActiveTab] = useState('overview');

  // Get organizer's events
  const myEvents = useMemo(() => {
    const organizer = organizers.find(org => org.id === user.organizerId);
    if (!organizer) return [];
    return events.filter(event => event.organizerId === organizer.id);
  }, [events, organizers, user.organizerId]);

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const totalEvents = myEvents.length;
    const upcomingEvents = myEvents.filter(event => new Date(event.date) > now).length;
    const pastEvents = totalEvents - upcomingEvents;
    
    const eventIds = myEvents.map(e => e.id);
    const myRegistrations = registrations.filter(reg => eventIds.includes(reg.eventId));
    const totalRegistrations = myRegistrations.length;
    const pendingApprovals = myRegistrations.filter(reg => reg.status === 'pending').length;
    const approvedRegistrations = myRegistrations.filter(reg => reg.status === 'approved').length;
    
    return {
      totalEvents,
      upcomingEvents,
      pastEvents,
      totalRegistrations,
      pendingApprovals,
      approvedRegistrations
    };
  }, [myEvents, registrations]);

  // Get recent registrations (last 10)
  const recentRegistrations = useMemo(() => {
    const eventIds = myEvents.map(e => e.id);
    return registrations
      .filter(reg => eventIds.includes(reg.eventId))
      .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
      .slice(0, 10)
      .map(reg => ({
        ...reg,
        event: myEvents.find(e => e.id === reg.eventId)
      }));
  }, [myEvents, registrations]);

  // Group events by status
  const eventsByStatus = useMemo(() => {
    const upcoming = myEvents.filter(e => getEventStatus(e.date) === EVENT_STATUS.UPCOMING);
    const ongoing = myEvents.filter(e => getEventStatus(e.date) === EVENT_STATUS.ONGOING);
    const past = myEvents.filter(e => getEventStatus(e.date) === EVENT_STATUS.PAST);
    
    return { upcoming, ongoing, past };
  }, [myEvents]);

  const renderStatCard = (title, value, subtitle, icon) => (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3>{value}</h3>
        <p className="stat-title">{title}</p>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
    </div>
  );

  const renderRecentRegistration = (registration) => (
    <div key={registration.id} className="registration-item">
      <div className="registration-info">
        <h4>{registration.participantName}</h4>
        <p className="registration-event">{registration.event?.title}</p>
        <span className="registration-date">{formatDate(registration.registeredAt)}</span>
      </div>
      <span className={`status-badge ${registration.status}`}>
        {registration.status}
      </span>
    </div>
  );

  const renderEventCard = (event) => {
    const eventRegs = registrations.filter(r => r.eventId === event.id);
    const pendingCount = eventRegs.filter(r => r.status === 'pending').length;
    
    return (
      <div key={event.id} className="mini-event-card">
        <div className="event-header">
          <h4>{event.title}</h4>
          <span className={`status-badge ${getEventStatus(event.date)}`}>
            {getEventStatus(event.date)}
          </span>
        </div>
        <p className="event-date">{formatDate(event.date)}</p>
        <div className="event-stats">
          <span>{eventRegs.length} registrations</span>
          {pendingCount > 0 && (
            <span className="pending-indicator">{pendingCount} pending</span>
          )}
        </div>
        <div className="event-actions">
          <Link to={`/organizer/events/${event.id}/manage`} className="btn-secondary-small">
            Manage
          </Link>
          <Link to={`/event/${event.id}`} className="btn-primary-small">
            View
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="organizer-dashboard">
      <div className="dashboard-header">
        <h1>Organizer Dashboard</h1>
        <Link to="/organizer/events/create" className="btn-primary">
          + Create Event
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        {renderStatCard('Total Events', stats.totalEvents, `${stats.upcomingEvents} upcoming`, '📅')}
        {renderStatCard('Total Registrations', stats.totalRegistrations, `${stats.approvedRegistrations} approved`, '👥')}
        {renderStatCard('Pending Approvals', stats.pendingApprovals, 'Requires action', '⏳')}
        {renderStatCard('Past Events', stats.pastEvents, 'Completed', '✅')}
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'registrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrations')}
        >
          Recent Registrations
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            {/* Upcoming Events */}
            <div className="events-section">
              <div className="section-header">
                <h2>Upcoming Events</h2>
                <Link to="/organizer/events">View All →</Link>
              </div>
              {eventsByStatus.upcoming.length > 0 ? (
                <div className="events-grid">
                  {eventsByStatus.upcoming.slice(0, 3).map(renderEventCard)}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No upcoming events</p>
                  <Link to="/organizer/events/create" className="btn-primary">
                    Create Your First Event
                  </Link>
                </div>
              )}
            </div>

            {/* Ongoing Events */}
            {eventsByStatus.ongoing.length > 0 && (
              <div className="events-section">
                <div className="section-header">
                  <h2>Ongoing Events</h2>
                </div>
                <div className="events-grid">
                  {eventsByStatus.ongoing.map(renderEventCard)}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions">
              <h2>Quick Actions</h2>
              <div className="actions-grid">
                <Link to="/organizer/events/create" className="action-card">
                  <span className="action-icon">➕</span>
                  <h3>Create Event</h3>
                  <p>Set up a new event</p>
                </Link>
                <Link to="/organizer/events" className="action-card">
                  <span className="action-icon">📋</span>
                  <h3>Manage Events</h3>
                  <p>Edit or delete events</p>
                </Link>
                <Link to="/organizer/registrations" className="action-card">
                  <span className="action-icon">✓</span>
                  <h3>Approve Registrations</h3>
                  <p>{stats.pendingApprovals} pending</p>
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div className="registrations-section">
            <div className="section-header">
              <h2>Recent Registrations</h2>
              <Link to="/organizer/registrations">View All →</Link>
            </div>
            {recentRegistrations.length > 0 ? (
              <div className="registrations-list">
                {recentRegistrations.map(renderRecentRegistration)}
              </div>
            ) : (
              <div className="empty-state">
                <p>No registrations yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDashboard;
