import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { eventsAPI } from '../utils/api';
import { EVENT_TYPES, EVENT_CATEGORIES } from '../utils/constants';
import './EventForm.css';

function EventForm({ events, onSubmit, isEdit = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    category: EVENT_CATEGORIES[0],
    type: EVENT_TYPES.EVENT,
    capacity: 100,
    endDate: '',
    registrationDeadline: '',
    eligibility: 'All',
    registrationFee: 0
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
              endDate: event.endDate ? event.endDate.split('T')[0] : event.date ? event.date.split('T')[0] : '',
              time: event.time || '',
              location: event.location || '',
              description: event.description || '',
              category: event.category || EVENT_CATEGORIES[0],
              type: event.type || EVENT_TYPES.EVENT,
              capacity: event.capacity || event.maxParticipants || 100,
              registrationDeadline: event.registrationDeadline ? event.registrationDeadline.split('T')[0] : '',
              eligibility: event.eligibility || 'All',
              registrationFee: event.registrationFee || 0
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

    if (!formData.endDate) {
      newErrors.endDate = 'Event end date is required';
    } else {
      const endDate = new Date(formData.endDate);
      const startDate = new Date(formData.date);
      if (endDate < startDate) {
        newErrors.endDate = 'End date must be on or after start date';
      }
    }

    if (!formData.registrationDeadline) {
      newErrors.registrationDeadline = 'Registration deadline is required';
    } else {
      const deadline = new Date(formData.registrationDeadline);
      const startDate = new Date(formData.date);
      if (deadline > startDate) {
        newErrors.registrationDeadline = 'Deadline must be before start date';
      }
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

    if (!formData.type) {
      newErrors.type = 'Event type is required';
    }

    if (!formData.category) {
      newErrors.category = 'Event category is required';
    }

    if (formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    } else if (formData.capacity > 10000) {
      newErrors.capacity = 'Capacity cannot exceed 10,000';
    }

    if (formData.registrationFee < 0) {
      newErrors.registrationFee = 'Registration fee cannot be negative';
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
        const payload = {
          ...formData,
          maxParticipants: formData.capacity,
          registrationFee: Number(formData.registrationFee) || 0
        };
        
        if (isEdit) {
          response = await eventsAPI.updateEvent(id, payload);
        } else {
          response = await eventsAPI.createEvent(payload);
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

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="endDate">Event End Date *</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={errors.endDate ? 'error' : ''}
              />
              {errors.endDate && <span className="error-message">{errors.endDate}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="registrationDeadline">Registration Deadline *</label>
              <input
                type="date"
                id="registrationDeadline"
                name="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={handleChange}
                className={errors.registrationDeadline ? 'error' : ''}
              />
              {errors.registrationDeadline && <span className="error-message">{errors.registrationDeadline}</span>}
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
              <label htmlFor="type">Type *</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={errors.type ? 'error' : ''}
              >
                {Object.values(EVENT_TYPES).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.type && <span className="error-message">{errors.type}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={errors.category ? 'error' : ''}
              >
                {EVENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <span className="error-message">{errors.category}</span>}
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

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="eligibility">Eligibility *</label>
              <select
                id="eligibility"
                name="eligibility"
                value={formData.eligibility}
                onChange={handleChange}
              >
                <option value="All">All</option>
                <option value="IIIT">IIIT Only</option>
                <option value="Non-IIIT">External Only</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="registrationFee">Registration Fee</label>
              <input
                type="number"
                id="registrationFee"
                name="registrationFee"
                value={formData.registrationFee}
                min="0"
                onChange={handleChange}
                className={errors.registrationFee ? 'error' : ''}
              />
              {errors.registrationFee && <span className="error-message">{errors.registrationFee}</span>}
            </div>
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
