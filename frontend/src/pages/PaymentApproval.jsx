import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/helpers';
import './PaymentApproval.css';

const PaymentApproval = () => {
  const { user } = useAuth();
  const { events, registrations, updateRegistration } = useData();
  const { showSuccess, showError } = useToast();

  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedEventFilter, setSelectedEventFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Get organizer's events that require payment
  const paymentEvents = useMemo(() => {
    if (!user?.organizerId) return [];
    return events.filter(e => 
      e.organizerId === user.organizerId && 
      e.requiresPayment && 
      e.paymentAmount
    );
  }, [events, user]);

  // Get payment registrations
  const paymentRegistrations = useMemo(() => {
    const eventIds = paymentEvents.map(e => e.id);
    return registrations
      .filter(reg => eventIds.includes(reg.eventId) && reg.paymentStatus !== 'not_required')
      .map(reg => ({
        ...reg,
        event: events.find(e => e.id === reg.eventId)
      }))
      .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  }, [registrations, paymentEvents, events]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    let filtered = paymentRegistrations;

    if (selectedEventFilter !== 'all') {
      filtered = filtered.filter(p => p.eventId == selectedEventFilter);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.paymentStatus === filterStatus);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        (p.participantName?.toLowerCase() || '').includes(search) ||
        (p.email?.toLowerCase() || '').includes(search) ||
        (p.transactionId?.toLowerCase() || '').includes(search)
      );
    }

    return filtered;
  }, [paymentRegistrations, selectedEventFilter, filterStatus, searchTerm]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = paymentRegistrations.length;
    const pending = paymentRegistrations.filter(p => p.paymentStatus === 'pending').length;
    const approved = paymentRegistrations.filter(p => p.paymentStatus === 'verified').length;
    const rejected = paymentRegistrations.filter(p => p.paymentStatus === 'rejected').length;
    const totalRevenue = paymentRegistrations
      .filter(p => p.paymentStatus === 'verified')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return { total, pending, approved, rejected, totalRevenue };
  }, [paymentRegistrations]);

  const handleApprove = (paymentId) => {
    updateRegistration(paymentId, { 
      paymentStatus: 'verified',
      verifiedAt: new Date().toISOString(),
      verifiedBy: user.id
    });
    showSuccess('Payment approved successfully');
    setShowDetailModal(false);
  };

  const handleReject = (paymentId, reason) => {
    updateRegistration(paymentId, { 
      paymentStatus: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedBy: user.id,
      rejectionReason: reason || 'Payment verification failed'
    });
    showSuccess('Payment rejected');
    setShowDetailModal(false);
  };

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  return (
    <div className="payment-approval">
      <div className="page-header">
        <h1>Payment Approvals</h1>
        <p>Verify and approve participant payments</p>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card pending">
          <h3>{stats.pending}</h3>
          <p>Pending Verification</p>
        </div>
        <div className="stat-card approved">
          <h3>{stats.approved}</h3>
          <p>Approved</p>
        </div>
        <div className="stat-card rejected">
          <h3>{stats.rejected}</h3>
          <p>Rejected</p>
        </div>
        <div className="stat-card revenue">
          <h3>₹{stats.totalRevenue.toLocaleString()}</h3>
          <p>Total Revenue</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label>Event:</label>
            <select value={selectedEventFilter} onChange={(e) => setSelectedEventFilter(e.target.value)}>
              <option value="all">All Events</option>
              {paymentEvents.map(event => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Grid */}
      {filteredPayments.length === 0 ? (
        <div className="empty-state">
          <p>No payment records found</p>
        </div>
      ) : (
        <div className="payments-grid">
          {filteredPayments.map(payment => (
            <div key={payment.id} className="payment-card">
              <div className="payment-header">
                <div>
                  <h3>{payment.participantName}</h3>
                  <p className="payment-email">{payment.email}</p>
                </div>
                <span className={`payment-status status-${payment.paymentStatus}`}>
                  {payment.paymentStatus}
                </span>
              </div>

              <div className="payment-details">
                <div className="detail-row">
                  <span className="label">Event:</span>
                  <span className="value">{payment.event?.title}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Amount:</span>
                  <span className="value amount">₹{payment.amount || 0}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Registered:</span>
                  <span className="value">{formatDate(payment.registeredAt)}</span>
                </div>
                {payment.transactionId && (
                  <div className="detail-row">
                    <span className="label">Transaction ID:</span>
                    <span className="value transaction-id">{payment.transactionId}</span>
                  </div>
                )}
              </div>

              {payment.paymentScreenshot && (
                <div className="payment-screenshot">
                  <img src={payment.paymentScreenshot} alt="Payment proof" />
                </div>
              )}

              <div className="payment-actions">
                <button
                  className="btn-view"
                  onClick={() => handleViewDetails(payment)}
                >
                  View Details
                </button>
                {payment.paymentStatus === 'pending' && (
                  <>
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(payment.id)}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => {
                        const reason = prompt('Reason for rejection:');
                        if (reason) handleReject(payment.id, reason);
                      }}
                    >
                      ✗ Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Payment Details</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Participant Information</h3>
                <div className="detail-row">
                  <span className="label">Name:</span>
                  <span className="value">{selectedPayment.participantName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email:</span>
                  <span className="value">{selectedPayment.email}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Phone:</span>
                  <span className="value">{selectedPayment.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Payment Information</h3>
                <div className="detail-row">
                  <span className="label">Event:</span>
                  <span className="value">{selectedPayment.event?.title}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Amount:</span>
                  <span className="value amount">₹{selectedPayment.amount || 0}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Status:</span>
                  <span className="value">
                    <span className={`payment-status status-${selectedPayment.paymentStatus}`}>
                      {selectedPayment.paymentStatus}
                    </span>
                  </span>
                </div>
                {selectedPayment.transactionId && (
                  <div className="detail-row">
                    <span className="label">Transaction ID:</span>
                    <span className="value transaction-id">{selectedPayment.transactionId}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Registered At:</span>
                  <span className="value">{formatDate(selectedPayment.registeredAt)}</span>
                </div>
              </div>

              {selectedPayment.paymentScreenshot && (
                <div className="detail-section">
                  <h3>Payment Proof</h3>
                  <div className="screenshot-large">
                    <img src={selectedPayment.paymentScreenshot} alt="Payment proof" />
                  </div>
                </div>
              )}

              {selectedPayment.rejectionReason && (
                <div className="detail-section rejection">
                  <h3>Rejection Reason</h3>
                  <p>{selectedPayment.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {selectedPayment.paymentStatus === 'pending' && (
                <>
                  <button
                    className="btn-approve-modal"
                    onClick={() => handleApprove(selectedPayment.id)}
                  >
                    Approve Payment
                  </button>
                  <button
                    className="btn-reject-modal"
                    onClick={() => {
                      const reason = prompt('Reason for rejection:');
                      if (reason) handleReject(selectedPayment.id, reason);
                    }}
                  >
                    Reject Payment
                  </button>
                </>
              )}
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentApproval;
