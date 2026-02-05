import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/helpers';
import './UserManagement.css';

const UserManagement = () => {
  const { users, registrations, updateUser, deleteUser } = useData();
  const { showSuccess, showError } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive !== false).length;
    const participants = users.filter(u => u.role === 'participant').length;
    const organizers = users.filter(u => u.role === 'organizer').length;
    
    return { totalUsers, activeUsers, participants, organizers };
  }, [users]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && user.isActive !== false) ||
        (statusFilter === 'inactive' && user.isActive === false);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Get user activity data
  const getUserActivity = (userId) => {
    const userRegs = registrations.filter(r => r.userId === userId);
    return {
      totalRegistrations: userRegs.length,
      approvedRegistrations: userRegs.filter(r => r.status === 'approved').length,
      pendingRegistrations: userRegs.filter(r => r.status === 'pending').length,
      recentRegistrations: userRegs
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
        .slice(0, 5)
    };
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleToggleStatus = (user) => {
    const newStatus = user.isActive !== false ? false : true;
    updateUser(user.id, { isActive: newStatus });
    showSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      // Check if user has any registrations
      const userRegs = registrations.filter(r => r.userId === userToDelete.id);
      
      if (userRegs.length > 0) {
        showError(`Cannot delete user with ${userRegs.length} event registrations`);
        setShowDeleteModal(false);
        setUserToDelete(null);
        return;
      }

      deleteUser(userToDelete.id);
      showSuccess('User deleted successfully');
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleResetPassword = (user) => {
    // In a real app, this would send a password reset email
    showSuccess(`Password reset email sent to ${user.email}`);
  };

  return (
    <div className="user-management">
      <div className="page-header">
        <h1>User Management</h1>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.totalUsers}</h3>
          <p>Total Users</p>
        </div>
        <div className="stat-card">
          <h3>{stats.activeUsers}</h3>
          <p>Active Users</p>
        </div>
        <div className="stat-card">
          <h3>{stats.participants}</h3>
          <p>Participants</p>
        </div>
        <div className="stat-card">
          <h3>{stats.organizers}</h3>
          <p>Organizers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filters-row">
          <div className="filter-group">
            <label>Role:</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="participant">Participants</option>
              <option value="organizer">Organizers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Registrations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">
                  <p>No users found</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const activity = getUserActivity(user.id);
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-info">
                        <strong>{user.name || 'N/A'}</strong>
                        {user.rollNumber && <span className="roll-number">{user.rollNumber}</span>}
                      </div>
                    </td>
                    <td>{user.email || 'N/A'}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${user.isActive !== false ? 'active' : 'inactive'}`}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(user.joinedAt || new Date())}</td>
                    <td className="number">{activity.totalRegistrations}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-view"
                          onClick={() => handleViewDetails(user)}
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          className={`btn-toggle ${user.isActive !== false ? 'active' : ''}`}
                          onClick={() => handleToggleStatus(user)}
                          title={user.isActive !== false ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive !== false ? '🔓' : '🔒'}
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteClick(user)}
                          title="Delete User"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Basic Information */}
              <div className="detail-section">
                <h3>Basic Information</h3>
                <div className="detail-row">
                  <span className="label">Name:</span>
                  <span className="value">{selectedUser.name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email:</span>
                  <span className="value">{selectedUser.email}</span>
                </div>
                {selectedUser.rollNumber && (
                  <div className="detail-row">
                    <span className="label">Roll Number:</span>
                    <span className="value">{selectedUser.rollNumber}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Role:</span>
                  <span className="value">
                    <span className={`role-badge role-${selectedUser.role}`}>
                      {selectedUser.role}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Status:</span>
                  <span className="value">
                    <span className={`status-badge status-${selectedUser.isActive !== false ? 'active' : 'inactive'}`}>
                      {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Joined:</span>
                  <span className="value">{formatDate(selectedUser.joinedAt || new Date())}</span>
                </div>
              </div>

              {/* Activity Statistics */}
              {selectedUser.role === 'participant' && (() => {
                const activity = getUserActivity(selectedUser.id);
                return (
                  <>
                    <div className="detail-section">
                      <h3>Activity Statistics</h3>
                      <div className="stats-row">
                        <div className="stat-item">
                          <span className="stat-number">{activity.totalRegistrations}</span>
                          <span className="stat-label">Total Events</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-number">{activity.approvedRegistrations}</span>
                          <span className="stat-label">Approved</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-number">{activity.pendingRegistrations}</span>
                          <span className="stat-label">Pending</span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    {activity.recentRegistrations.length > 0 && (
                      <div className="detail-section">
                        <h3>Recent Registrations</h3>
                        <div className="activity-list">
                          {activity.recentRegistrations.map(reg => (
                            <div key={reg.id} className="activity-item">
                              <div className="activity-info">
                                <strong>Event #{reg.eventId}</strong>
                                <span className={`status-badge status-${reg.status}`}>
                                  {reg.status}
                                </span>
                              </div>
                              <span className="activity-date">
                                {formatDate(reg.registeredAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => handleResetPassword(selectedUser)}
              >
                Reset Password
              </button>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <p>
                Are you sure you want to delete <strong>{userToDelete.name}</strong>?
              </p>
              <p className="warning-text">
                This action cannot be undone. The user will not be deleted if they have any event registrations.
              </p>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
