import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from './Toast.jsx';
import { formatDate } from '../utils/helpers.js';
import './DiscussionForum.css';

function DiscussionForum() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events } = useData();
  const { showSuccess, showError } = useToast();

  const [discussions, setDiscussions] = useState(() => {
    const stored = localStorage.getItem('ems_discussions');
    return stored ? JSON.parse(stored) : [];
  });

  const [newThread, setNewThread] = useState({ title: '', content: '', category: 'General' });
  const [showNewThread, setShowNewThread] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState('recent');

  const event = events.find(e => e.id === parseInt(eventId) || e.id === eventId.toString());

  const categories = ['General', 'Questions', 'Feedback', 'Technical', 'Announcements'];

  const eventDiscussions = useMemo(() => {
    return discussions.filter(d => d.eventId === eventId);
  }, [discussions, eventId]);

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

  const saveDiscussions = (updatedDiscussions) => {
    setDiscussions(updatedDiscussions);
    localStorage.setItem('ems_discussions', JSON.stringify(updatedDiscussions));
  };

  const handleCreateThread = () => {
    if (!newThread.title.trim() || !newThread.content.trim()) {
      showError('Please fill in all fields');
      return;
    }

    const thread = {
      id: Date.now().toString(),
      eventId,
      title: newThread.title,
      content: newThread.content,
      category: newThread.category,
      author: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role
      },
      createdAt: new Date().toISOString(),
      replies: [],
      views: 0,
      isPinned: false,
      isClosed: false
    };

    saveDiscussions([...discussions, thread]);
    setNewThread({ title: '', content: '', category: 'General' });
    setShowNewThread(false);
    showSuccess('Discussion thread created successfully!');
  };

  const handleAddReply = () => {
    if (!replyContent.trim()) {
      showError('Please enter a reply');
      return;
    }

    const reply = {
      id: Date.now().toString(),
      content: replyContent,
      author: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role
      },
      createdAt: new Date().toISOString()
    };

    const updatedDiscussions = discussions.map(d => {
      if (d.id === selectedThread.id) {
        return { ...d, replies: [...(d.replies || []), reply] };
      }
      return d;
    });

    saveDiscussions(updatedDiscussions);
    setReplyContent('');
    setSelectedThread({ ...selectedThread, replies: [...(selectedThread.replies || []), reply] });
    showSuccess('Reply added successfully!');
  };

  const handleDeleteThread = (threadId) => {
    if (!window.confirm('Are you sure you want to delete this thread?')) return;
    
    const updatedDiscussions = discussions.filter(d => d.id !== threadId);
    saveDiscussions(updatedDiscussions);
    setSelectedThread(null);
    showSuccess('Thread deleted successfully');
  };

  const handlePinThread = (threadId) => {
    const updatedDiscussions = discussions.map(d => {
      if (d.id === threadId) {
        return { ...d, isPinned: !d.isPinned };
      }
      return d;
    });
    saveDiscussions(updatedDiscussions);
    showSuccess('Thread updated');
  };

  const openThread = (thread) => {
    // Increment views
    const updatedDiscussions = discussions.map(d => {
      if (d.id === thread.id) {
        return { ...d, views: (d.views || 0) + 1 };
      }
      return d;
    });
    saveDiscussions(updatedDiscussions);
    setSelectedThread({ ...thread, views: (thread.views || 0) + 1 });
  };

  const isOrganizer = event.organizerId === user?.id || user?.role === 'Admin';

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
              key={thread.id} 
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
                  <span className="author-name">{thread.author.name}</span>
                  <span className="author-role">({thread.author.role})</span>
                  <span>•</span>
                  <span>{formatDate(thread.createdAt)}</span>
                </div>
                <div className="thread-stats">
                  <span>👁️ {thread.views || 0}</span>
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
                  <div className="author-avatar">{selectedThread.author.name.charAt(0)}</div>
                  <div className="author-details">
                    <div className="author-name">{selectedThread.author.name}</div>
                    <div className="author-role">{selectedThread.author.role}</div>
                    <div className="post-time">{formatDate(selectedThread.createdAt)}</div>
                  </div>
                </div>
                <div className="post-content">{selectedThread.content}</div>
                {isOrganizer && (
                  <div className="post-actions">
                    <button 
                      className="btn-action"
                      onClick={() => handlePinThread(selectedThread.id)}
                    >
                      {selectedThread.isPinned ? '📌 Unpin' : '📌 Pin'}
                    </button>
                    <button 
                      className="btn-action danger"
                      onClick={() => handleDeleteThread(selectedThread.id)}
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
                    <div key={reply.id} className="post reply-post">
                      <div className="post-author">
                        <div className="author-avatar">{reply.author.name.charAt(0)}</div>
                        <div className="author-details">
                          <div className="author-name">{reply.author.name}</div>
                          <div className="author-role">{reply.author.role}</div>
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
