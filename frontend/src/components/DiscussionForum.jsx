import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from './Toast.jsx';
import { discussionsAPI } from '../utils/api';
import { formatDate } from '../utils/helpers.js';
import './DiscussionForum.css';

function DiscussionForum() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events } = useData();
  const { showSuccess, showError } = useToast();

  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newThread, setNewThread] = useState({ title: '', content: '', category: 'General' });
  const [showNewThread, setShowNewThread] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    const fetchDiscussions = async () => {
      try {
        setLoading(true);
        const response = await discussionsAPI.getEventDiscussions(eventId);
        if (response.success) {
          setDiscussions(response.data || []);
        }
      } catch (err) {
        console.error('Error fetching discussions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscussions();
  }, [eventId]);

  const event = events.find(e => (e._id || e.id) === eventId);

  const categories = ['General', 'Questions', 'Technical', 'Suggestions', 'Issues'];

  const eventDiscussions = useMemo(() => {
    // API already filters by eventId, so just return all discussions
    return discussions;
  }, [discussions]);

  const getAuthorName = (author) => {
    if (!author) return 'Unknown';
    const name = `${author.firstName || ''} ${author.lastName || ''}`.trim();
    return name || author.email || 'Unknown';
  };

  const filteredDiscussions = useMemo(() => {
    let filtered = eventDiscussions;
    
    if (filterCategory !== 'All') {
      filtered = filtered.filter(d => d.category === filterCategory);
    }

    // Sort discussions
    if (sortBy === 'recent') {
      filtered = [...filtered].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    } else if (sortBy === 'popular') {
      filtered = [...filtered].sort((a, b) => 
        (b.replies?.length || 0) - (a.replies?.length || 0)
      );
    } else if (sortBy === 'unanswered') {
      filtered = filtered.filter(d => !d.replies || d.replies.length === 0);
    }

    return filtered;
  }, [eventDiscussions, filterCategory, sortBy]);

  if (!event) {
    return (
      <div className="forum-container">
        <div className="not-found">
          <h2>Event Not Found</h2>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const handleCreateThread = async () => {
    if (!newThread.title.trim() || !newThread.content.trim()) {
      showError('Please fill in all fields');
      return;
    }

    try {
      const response = await discussionsAPI.createThread(eventId, {
        title: newThread.title,
        content: newThread.content,
        category: newThread.category
      });

      if (response.success) {
        setDiscussions(prev => [response.data, ...prev]);
        setNewThread({ title: '', content: '', category: 'General' });
        setShowNewThread(false);
        showSuccess('Thread created successfully');
      } else {
        showError(response.message || 'Failed to create thread');
      }
    } catch (err) {
      console.error('Error creating thread:', err);
      showError('Failed to create thread');
    }
  };

  const handleAddReply = async () => {
    if (!replyContent.trim()) {
      showError('Please enter a reply');
      return;
    }

    try {
      const response = await discussionsAPI.reply(selectedThread._id || selectedThread.id, replyContent);

      if (response.success) {
        setDiscussions(prev =>
          prev.map(d =>
            (d._id === selectedThread._id || d.id === selectedThread.id)
              ? response.data
              : d
          )
        );
        setSelectedThread(response.data);
        setReplyContent('');
        showSuccess('Reply added successfully');
      } else {
        showError(response.message || 'Failed to add reply');
      }
    } catch (err) {
      console.error('Error adding reply:', err);
      showError('Failed to add reply');
    }
  };

  const handleDeleteThread = async (threadId) => {
    if (!window.confirm('Are you sure you want to delete this thread?')) return;
    try {
      const response = await discussionsAPI.delete(threadId);
      if (response.success) {
        setDiscussions(prev => prev.filter(d => (d._id || d.id) !== threadId));
        setSelectedThread(null);
        showSuccess('Thread deleted successfully');
      } else {
        showError(response.message || 'Failed to delete thread');
      }
    } catch (err) {
      showError('Failed to delete thread');
    }
  };

  const handlePinThread = async (threadId) => {
    try {
      const response = await discussionsAPI.togglePin(threadId);
      if (response.success) {
        setDiscussions(prev => prev.map(d => ((d._id || d.id) === threadId ? response.data : d)));
        if (selectedThread && (selectedThread._id || selectedThread.id) === threadId) {
          setSelectedThread(response.data);
        }
        showSuccess('Thread updated');
      } else {
        showError(response.message || 'Failed to update thread');
      }
    } catch (err) {
      showError('Failed to update thread');
    }
  };

  const openThread = (thread) => {
    setSelectedThread(thread);
  };

  const organizerId = event.organizer?._id || event.organizer || event.organizerId;
  const isOrganizer = organizerId?.toString() === user?.id || user?.role === 'Admin';

  return (
    <div className="forum-container">
      <div className="forum-header">
        <div className="header-top">
          <Link to={`/event/${eventId}`} className="btn-back">
            ← Back to Event
          </Link>
          <div className="header-info">
            <h1>💬 Discussion Forum</h1>
            <p className="event-title">{event.title}</p>
          </div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowNewThread(true)}
        >
          + New Discussion
        </button>
      </div>

      {/* Stats */}
      <div className="forum-stats">
        <div className="stat-item">
          <span className="stat-value">{eventDiscussions.length}</span>
          <span className="stat-label">Discussions</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {eventDiscussions.reduce((acc, d) => acc + (d.replies?.length || 0), 0)}
          </span>
          <span className="stat-label">Replies</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {eventDiscussions.filter(d => !d.replies || d.replies.length === 0).length}
          </span>
          <span className="stat-label">Unanswered</span>
        </div>
      </div>

      {/* Filters */}
      <div className="forum-filters">
        <div className="filter-group">
          <label>Category:</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
            <option value="unanswered">Unanswered</option>
          </select>
        </div>
      </div>

      {/* Thread List */}
      <div className="threads-container">
        {filteredDiscussions.length === 0 ? (
          <div className="empty-state">
            <p>No discussions yet. Start the conversation!</p>
          </div>
        ) : (
          filteredDiscussions.map(thread => (
            <div 
              key={thread._id || thread.id} 
              className={`thread-card ${thread.isPinned ? 'pinned' : ''}`}
              onClick={() => openThread(thread)}
            >
              {thread.isPinned && <div className="pin-badge">📌 Pinned</div>}
              <div className="thread-header">
                <h3>{thread.title}</h3>
                <span className={`category-badge ${thread.category.toLowerCase()}`}>
                  {thread.category}
                </span>
              </div>
              <p className="thread-preview">{thread.content}</p>
              <div className="thread-meta">
                <div className="author-info">
                  <span className="author-name">{getAuthorName(thread.author)}</span>
                  {thread.author?.role && (
                    <span className="author-role">({thread.author.role})</span>
                  )}
                  <span>•</span>
                  <span>{formatDate(thread.createdAt)}</span>
                </div>
                <div className="thread-stats">
                  <span>👁️ {thread.views || thread.viewCount || 0}</span>
                  <span>💬 {thread.replies?.length || 0} replies</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Thread Modal */}
      {showNewThread && (
        <div className="modal-overlay" onClick={() => setShowNewThread(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Discussion</h2>
              <button className="close-btn" onClick={() => setShowNewThread(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Category</label>
                <select 
                  value={newThread.category}
                  onChange={(e) => setNewThread({ ...newThread, category: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Enter discussion title..."
                  value={newThread.title}
                  onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  placeholder="What would you like to discuss?"
                  rows="6"
                  value={newThread.content}
                  onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewThread(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateThread}>
                Create Thread
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread Detail Modal */}
      {selectedThread && (
        <div className="modal-overlay" onClick={() => setSelectedThread(null)}>
          <div className="modal-content thread-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="thread-title-section">
                <h2>{selectedThread.title}</h2>
                <span className={`category-badge ${selectedThread.category.toLowerCase()}`}>
                  {selectedThread.category}
                </span>
              </div>
              <button className="close-btn" onClick={() => setSelectedThread(null)}>×</button>
            </div>
            
            <div className="modal-body thread-detail">
              {/* Original Post */}
              <div className="post original-post">
                <div className="post-author">
                  <div className="author-avatar">{getAuthorName(selectedThread.author).charAt(0)}</div>
                  <div className="author-details">
                    <div className="author-name">{getAuthorName(selectedThread.author)}</div>
                    {selectedThread.author?.role && (
                      <div className="author-role">{selectedThread.author.role}</div>
                    )}
                    <div className="post-time">{formatDate(selectedThread.createdAt)}</div>
                  </div>
                </div>
                <div className="post-content">{selectedThread.content}</div>
                {isOrganizer && (
                  <div className="post-actions">
                    <button 
                      className="btn-action"
                      onClick={() => handlePinThread(selectedThread._id || selectedThread.id)}
                    >
                      {selectedThread.isPinned ? '📌 Unpin' : '📌 Pin'}
                    </button>
                    <button 
                      className="btn-action danger"
                      onClick={() => handleDeleteThread(selectedThread._id || selectedThread.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Replies */}
              {selectedThread.replies && selectedThread.replies.length > 0 && (
                <div className="replies-section">
                  <h3>{selectedThread.replies.length} Replies</h3>
                  {selectedThread.replies.map(reply => (
                    <div key={reply._id || reply.id} className="post reply-post">
                      <div className="post-author">
                        <div className="author-avatar">{getAuthorName(reply.author).charAt(0)}</div>
                        <div className="author-details">
                          <div className="author-name">{getAuthorName(reply.author)}</div>
                          {reply.author?.role && (
                            <div className="author-role">{reply.author.role}</div>
                          )}
                          <div className="post-time">{formatDate(reply.createdAt)}</div>
                        </div>
                      </div>
                      <div className="post-content">{reply.content}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              <div className="reply-form">
                <h3>Add Reply</h3>
                <textarea
                  placeholder="Write your reply..."
                  rows="4"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleAddReply}>
                  Post Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscussionForum;
