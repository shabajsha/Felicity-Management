import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/helpers';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { events, registrations, organizers, users } = useData();
  const [timeRange, setTimeRange] = useState('week'); // week, month, all

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filterByDate = (items, dateField) => {
      return {
        week: items.filter(item => new Date(item[dateField]) >= weekAgo).length,
        month: items.filter(item => new Date(item[dateField]) >= monthAgo).length,
        all: items.length
      };
    };

    const totalUsers = users.length;
    const participants = users.filter(u => u.role === 'Participant').length;
    const organizersCount = users.filter(u => u.role === 'Organizer').length;
    
    const totalEvents = events.length;
    const upcomingEvents = events.filter(e => new Date(e.date) > now).length;
    const pastEvents = totalEvents - upcomingEvents;

    const newEvents = filterByDate(events.filter(e => e.createdAt), 'createdAt');
    const newRegistrations = filterByDate(registrations.filter(r => r.registeredAt), 'registeredAt');

    const pendingApprovals = registrations.filter(r => r.status === 'pending').length;
    const totalRevenue = registrations
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => {
        const event = events.find(e => e.id === r.eventId);
        return sum + (event?.registrationFee || 0);
      }, 0);

    return {
      totalUsers,
      participants,
      organizersCount,
      totalEvents,
      upcomingEvents,
      pastEvents,
      newEvents,
      newRegistrations,
      pendingApprovals,
      totalRevenue,
      totalRegistrations: registrations.length
    };
  }, [events, registrations, organizers, users]);

  // Recent activities
  const recentActivities = useMemo(() => {
    const activities = [];

    // Recent events
    events
      .filter(e => e.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .forEach(event => {
        activities.push({
          type: 'event',
          message: `New event created: ${event.title}`,
          date: event.createdAt,
          organizer: event.organizer
        });
      });

    // Recent registrations
    registrations
      .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
      .slice(0, 5)
      .forEach(reg => {
        const event = events.find(e => e.id === reg.eventId);
        if (event) {
          activities.push({
            type: 'registration',
            message: `${reg.participantName} registered for ${event.title}`,
            date: reg.registeredAt,
            status: reg.status
          });
        }
      });

    return activities
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
  }, [events, registrations]);

  // Popular events
  const popularEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => (b.registered || 0) - (a.registered || 0))
      .slice(0, 5);
  }, [events]);

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="time-range-selector">
          <button
            className={timeRange === 'week' ? 'active' : ''}
            onClick={() => setTimeRange('week')}
          >
            This Week
          </button>
          <button
            className={timeRange === 'month' ? 'active' : ''}
            onClick={() => setTimeRange('month')}
          >
            This Month
          </button>
          <button
            className={timeRange === 'all' ? 'active' : ''}
            onClick={() => setTimeRange('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Main Statistics Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
            <span className="stat-detail">
              {stats.participants} participants • {stats.organizersCount} organizers
            </span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>{stats.totalEvents}</h3>
            <p>Total Events</p>
            <span className="stat-detail">
              {stats.upcomingEvents} upcoming • {stats.pastEvents} past
            </span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>{stats.totalRegistrations}</h3>
            <p>Total Registrations</p>
            <span className="stat-detail">
              {stats.pendingApprovals} pending approval
            </span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>₹{stats.totalRevenue.toLocaleString()}</h3>
            <p>Total Revenue</p>
            <span className="stat-detail">From approved registrations</span>
          </div>
        </div>
      </div>

      {/* Activity Statistics */}
      <div className="activity-stats">
        <div className="activity-card">
          <h3>New Events</h3>
          <div className="activity-numbers">
            <div className="activity-number">
              <span className="number">{stats.newEvents[timeRange]}</span>
              <span className="label">
                {timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'All Time'}
              </span>
            </div>
          </div>
        </div>

        <div className="activity-card">
          <h3>New Registrations</h3>
          <div className="activity-numbers">
            <div className="activity-number">
              <span className="number">{stats.newRegistrations[timeRange]}</span>
              <span className="label">
                {timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'All Time'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Recent Activities */}
        <div className="section">
          <div className="section-header">
            <h2>Recent Activities</h2>
          </div>
          <div className="activities-list">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className={`activity-icon ${activity.type}`}>
                    {activity.type === 'event' ? '📅' : '📝'}
                  </div>
                  <div className="activity-content">
                    <p>{activity.message}</p>
                    <span className="activity-meta">
                      {formatDate(activity.date)}
                      {activity.organizer && ` • ${activity.organizer}`}
                      {activity.status && (
                        <span className={`status-badge ${activity.status}`}>
                          {activity.status}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-message">No recent activities</p>
            )}
          </div>
        </div>

        {/* Popular Events */}
        <div className="section">
          <div className="section-header">
            <h2>Popular Events</h2>
            <Link to="/admin/events">View All →</Link>
          </div>
          <div className="popular-events">
            {popularEvents.map(event => (
              <div key={event.id} className="popular-event-card">
                <h4>{event.title}</h4>
                <div className="event-stats">
                  <span>{event.registered || 0} / {event.capacity || event.maxParticipants} registered</span>
                  <span className="event-date">{formatDate(event.date)}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${((event.registered || 0) / (event.capacity || event.maxParticipants || 1)) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/admin/users" className="action-card">
            <span className="action-icon">👥</span>
            <h3>Manage Users</h3>
            <p>View and manage all users</p>
          </Link>
          <Link to="/admin/clubs" className="action-card">
            <span className="action-icon">🏢</span>
            <h3>Manage Clubs</h3>
            <p>Approve and manage organizers</p>
          </Link>
          <Link to="/admin/events" className="action-card">
            <span className="action-icon">📅</span>
            <h3>Event Approval</h3>
            <p>Review pending events</p>
          </Link>
          <Link to="/admin/reports" className="action-card">
            <span className="action-icon">📊</span>
            <h3>View Reports</h3>
            <p>Analytics and insights</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
