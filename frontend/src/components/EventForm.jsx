import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { eventsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext.jsx';
import './EventForm.css';

function EventForm({ events, onSubmit, isEdit = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    category: 'Technology',
    organizer: '',
    capacity: 100
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (isEdit && id) {
        try {
          setLoading(true);
          const response = await eventsAPI.getEventById(id);
          if (response.success && response.data) {
            const event = response.data;
            setFormData({
              title: event.title || '',
              date: event.date ? event.date.split('T')[0] : '',
              time: event.time || '',
              location: event.location || '',
              description: event.description || '',
              category: event.category || 'Technology',
              organizer: event.organizerName || event.organizer || '',
              capacity: event.capacity || event.maxParticipants || 100
            });
          } else {
            setSubmitError('Event not found');
          }
        } catch (err) {
          console.error('Error fetching event:', err);
          setSubmitError('Failed to load event details');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchEvent();
  }, [isEdit, id]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.date) {
      newErrors.date = 'Event date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Event date cannot be in the past';
      }
    }

    if (!formData.time) {
      newErrors.time = 'Event time is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Event location is required';
    } else if (formData.location.length < 5) {
      newErrors.location = 'Location must be at least 5 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Event description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (!formData.organizer.trim()) {
      newErrors.organizer = 'Organizer name is required';
    }

    if (formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    } else if (formData.capacity > 10000) {
      newErrors.capacity = 'Capacity cannot exceed 10,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'capacity' ? (value === '' ? '' : Number(value)) : value;
    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (validateForm()) {
      try {
        setLoading(true);
        let response;
        
        if (isEdit) {
          response = await eventsAPI.updateEvent(id, formData);
        } else {
          response = await eventsAPI.createEvent(formData);
        }
        
        if (response.success) {
          navigate('/');
        } else {
          setSubmitError(response.message || 'Failed to save event');
        }
      } catch (err) {
        console.error('Error saving event:', err);
        setSubmitError('Failed to save event. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>{isEdit ? 'Edit Event' : 'Create New Event'}</h2>
        <p className="form-subtitle">
          {isEdit ? 'Update your event details' : 'Fill in the details to create an amazing event'}
        </p>

        {submitError && (
          <div className="error-banner">
            <p>{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label htmlFor="title">Event Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter event title"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Event Date *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={errors.date ? 'error' : ''}
              />
              {errors.date && <span className="error-message">{errors.date}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="time">Event Time *</label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className={errors.time ? 'error' : ''}
              />
              {errors.time && <span className="error-message">{errors.time}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location *</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter event location"
              className={errors.location ? 'error' : ''}
            />
            {errors.location && <span className="error-message">{errors.location}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="Technology">Technology</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Food & Drink">Food & Drink</option>
                <option value="Sports">Sports</option>
                <option value="Education">Education</option>
                <option value="Business">Business</option>
                <option value="Arts & Culture">Arts & Culture</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="capacity">Capacity *</label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                min="1"
                max="10000"
                className={errors.capacity ? 'error' : ''}
              />
              {errors.capacity && <span className="error-message">{errors.capacity}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="organizer">Organizer *</label>
            <input
              type="text"
              id="organizer"
              name="organizer"
              value={formData.organizer}
              onChange={handleChange}
              placeholder="Enter organizer name"
              className={errors.organizer ? 'error' : ''}
            />
            {errors.organizer && <span className="error-message">{errors.organizer}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your event in detail..."
              rows="5"
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/')} className="btn btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Event' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventForm;
