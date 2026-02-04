import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';
import { EVENT_TYPES, EVENT_CATEGORIES, PARTICIPANT_TYPES } from '../utils/constants';
import './EventFormBuilder.css';

const EventFormBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events, organizers, addEvent, updateEvent } = useData();
  const { showSuccess, showError } = useToast();

  const isEditMode = !!id;
  const existingEvent = isEditMode ? events.find(e => e.id === id) : null;

  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    venue: '',
    type: EVENT_TYPES.WORKSHOP,
    category: EVENT_CATEGORIES.TECHNICAL,
    maxParticipants: 50,
    registrationDeadline: '',
    participantType: PARTICIPANT_TYPES.INDIVIDUAL,
    allowTeams: false,
    minTeamSize: 2,
    maxTeamSize: 5,
    requiresApproval: false,
    registrationFee: 0,
    requiresPayment: false,
    imageUrl: '',
    tags: []
  });

  const [customFields, setCustomFields] = useState([]);
  const [newField, setNewField] = useState({
    label: '',
    type: 'text',
    required: false,
    options: []
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode && existingEvent) {
      setEventData({
        title: existingEvent.title,
        description: existingEvent.description,
        date: existingEvent.date.split('T')[0],
        time: existingEvent.time || '',
        location: existingEvent.location,
        venue: existingEvent.venue || '',
        type: existingEvent.type,
        category: existingEvent.category,
        maxParticipants: existingEvent.maxParticipants,
        registrationDeadline: existingEvent.registrationDeadline?.split('T')[0] || '',
        participantType: existingEvent.participantType,
        allowTeams: existingEvent.allowTeams || false,
        minTeamSize: existingEvent.minTeamSize || 2,
        maxTeamSize: existingEvent.maxTeamSize || 5,
        requiresApproval: existingEvent.requiresApproval || false,
        registrationFee: existingEvent.registrationFee || 0,
        requiresPayment: existingEvent.requiresPayment || false,
        imageUrl: existingEvent.imageUrl || '',
        tags: existingEvent.tags || []
      });
      setCustomFields(existingEvent.customFields || []);
    }
  }, [isEditMode, existingEvent]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !eventData.tags.includes(tagInput.trim())) {
      setEventData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEventData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFieldChange = (field, value) => {
    setNewField(prev => ({ ...prev, [field]: value }));
  };

  const handleAddCustomField = () => {
    if (!newField.label.trim()) {
      showError('Please enter a field label');
      return;
    }

    const field = {
      id: Date.now().toString(),
      ...newField,
      options: newField.type === 'select' || newField.type === 'radio' || newField.type === 'checkbox' 
        ? newField.options.filter(opt => opt.trim()) 
        : []
    };

    setCustomFields(prev => [...prev, field]);
    setNewField({
      label: '',
      type: 'text',
      required: false,
      options: []
    });
  };

  const handleRemoveCustomField = (fieldId) => {
    setCustomFields(prev => prev.filter(f => f.id !== fieldId));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...newField.options];
    newOptions[index] = value;
    setNewField(prev => ({ ...prev, options: newOptions }));
  };

  const handleAddOption = () => {
    setNewField(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const handleRemoveOption = (index) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!eventData.title.trim()) newErrors.title = 'Title is required';
    if (!eventData.description.trim()) newErrors.description = 'Description is required';
    if (!eventData.date) newErrors.date = 'Date is required';
    if (!eventData.location.trim()) newErrors.location = 'Location is required';
    if (eventData.maxParticipants < 1) newErrors.maxParticipants = 'Max participants must be at least 1';
    
    const eventDate = new Date(eventData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDate < today) newErrors.date = 'Event date cannot be in the past';
    
    if (eventData.registrationDeadline) {
      const deadline = new Date(eventData.registrationDeadline);
      if (deadline > eventDate) {
        newErrors.registrationDeadline = 'Registration deadline must be before event date';
      }
    }

    if (eventData.allowTeams) {
      if (eventData.minTeamSize < 2) newErrors.minTeamSize = 'Minimum team size must be at least 2';
      if (eventData.maxTeamSize < eventData.minTeamSize) {
        newErrors.maxTeamSize = 'Maximum team size must be greater than minimum';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Please fix the errors in the form');
      return;
    }

    const organizer = organizers.find(org => org.id === user.organizerId);
    if (!organizer) {
      showError('Organizer profile not found');
      return;
    }

    const eventPayload = {
      ...eventData,
      organizerId: organizer.id,
      organizer: organizer.name,
      customFields,
      createdAt: existingEvent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isEditMode) {
      updateEvent(id, eventPayload);
      showSuccess('Event updated successfully!');
      navigate(`/event/${id}`);
    } else {
      const newEventId = addEvent(eventPayload);
      showSuccess('Event created successfully!');
      navigate(`/event/${newEventId}`);
    }
  };

  const renderFieldPreview = (field) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return <input type={field.type} placeholder={`Enter ${field.label}`} disabled />;
      case 'textarea':
        return <textarea placeholder={`Enter ${field.label}`} rows="3" disabled />;
      case 'number':
        return <input type="number" placeholder={`Enter ${field.label}`} disabled />;
      case 'select':
        return (
          <select disabled>
            <option>Select {field.label}</option>
            {field.options.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="radio-group">
            {field.options.map((opt, i) => (
              <label key={i}>
                <input type="radio" name={field.id} value={opt} disabled />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="checkbox-group">
            {field.options.map((opt, i) => (
              <label key={i}>
                <input type="checkbox" value={opt} disabled />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'file':
        return <input type="file" disabled />;
      case 'date':
        return <input type="date" disabled />;
      default:
        return <input type="text" disabled />;
    }
  };

  return (
    <div className="event-form-builder">
      <div className="form-header">
        <h1>{isEditMode ? 'Edit Event' : 'Create New Event'}</h1>
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="event-form">
        {/* Basic Information */}
        <section className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-group">
            <label htmlFor="title">Event Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={eventData.title}
              onChange={handleInputChange}
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={eventData.description}
              onChange={handleInputChange}
              rows="5"
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Event Type *</label>
              <select
                id="type"
                name="type"
                value={eventData.type}
                onChange={handleInputChange}
              >
                {Object.values(EVENT_TYPES).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={eventData.category}
                onChange={handleInputChange}
              >
                {Object.values(EVENT_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="imageUrl">Image URL (optional)</label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              value={eventData.imageUrl}
              onChange={handleInputChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </section>

        {/* Date & Location */}
        <section className="form-section">
          <h2>Date & Location</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Event Date *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={eventData.date}
                onChange={handleInputChange}
                className={errors.date ? 'error' : ''}
              />
              {errors.date && <span className="error-message">{errors.date}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="time">Event Time</label>
              <input
                type="time"
                id="time"
                name="time"
                value={eventData.time}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="location">Location *</label>
              <input
                type="text"
                id="location"
                name="location"
                value={eventData.location}
                onChange={handleInputChange}
                placeholder="e.g., Main Campus"
                className={errors.location ? 'error' : ''}
              />
              {errors.location && <span className="error-message">{errors.location}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="venue">Venue (optional)</label>
              <input
                type="text"
                id="venue"
                name="venue"
                value={eventData.venue}
                onChange={handleInputChange}
                placeholder="e.g., Auditorium A"
              />
            </div>
          </div>
        </section>

        {/* Registration Settings */}
        <section className="form-section">
          <h2>Registration Settings</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="maxParticipants">Max Participants *</label>
              <input
                type="number"
                id="maxParticipants"
                name="maxParticipants"
                value={eventData.maxParticipants}
                onChange={handleInputChange}
                min="1"
                className={errors.maxParticipants ? 'error' : ''}
              />
              {errors.maxParticipants && <span className="error-message">{errors.maxParticipants}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="registrationDeadline">Registration Deadline</label>
              <input
                type="date"
                id="registrationDeadline"
                name="registrationDeadline"
                value={eventData.registrationDeadline}
                onChange={handleInputChange}
                className={errors.registrationDeadline ? 'error' : ''}
              />
              {errors.registrationDeadline && <span className="error-message">{errors.registrationDeadline}</span>}
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="requiresApproval"
                checked={eventData.requiresApproval}
                onChange={handleInputChange}
              />
              Require approval for registrations
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="participantType">Participant Type</label>
            <select
              id="participantType"
              name="participantType"
              value={eventData.participantType}
              onChange={handleInputChange}
            >
              {Object.values(PARTICIPANT_TYPES).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="allowTeams"
                checked={eventData.allowTeams}
                onChange={handleInputChange}
              />
              Allow team registrations
            </label>
          </div>

          {eventData.allowTeams && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="minTeamSize">Min Team Size</label>
                <input
                  type="number"
                  id="minTeamSize"
                  name="minTeamSize"
                  value={eventData.minTeamSize}
                  onChange={handleInputChange}
                  min="2"
                  className={errors.minTeamSize ? 'error' : ''}
                />
                {errors.minTeamSize && <span className="error-message">{errors.minTeamSize}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="maxTeamSize">Max Team Size</label>
                <input
                  type="number"
                  id="maxTeamSize"
                  name="maxTeamSize"
                  value={eventData.maxTeamSize}
                  onChange={handleInputChange}
                  min="2"
                  className={errors.maxTeamSize ? 'error' : ''}
                />
                {errors.maxTeamSize && <span className="error-message">{errors.maxTeamSize}</span>}
              </div>
            </div>
          )}
        </section>

        {/* Payment Settings */}
        <section className="form-section">
          <h2>Payment Settings</h2>
          
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="requiresPayment"
                checked={eventData.requiresPayment}
                onChange={handleInputChange}
              />
              Require payment for registration
            </label>
          </div>

          {eventData.requiresPayment && (
            <div className="form-group">
              <label htmlFor="registrationFee">Registration Fee (₹)</label>
              <input
                type="number"
                id="registrationFee"
                name="registrationFee"
                value={eventData.registrationFee}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
            </div>
          )}
        </section>

        {/* Tags */}
        <section className="form-section">
          <h2>Tags</h2>
          
          <div className="form-group">
            <label>Add Tags</label>
            <div className="tag-input-group">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Type and press Enter"
              />
              <button type="button" onClick={handleAddTag} className="btn-secondary">
                Add Tag
              </button>
            </div>
            <div className="tags-list">
              {eventData.tags.map(tag => (
                <span key={tag} className="tag">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}>×</button>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Custom Fields */}
        <section className="form-section">
          <h2>Custom Registration Fields</h2>
          <p className="section-description">
            Add custom fields to collect additional information during registration
          </p>

          <div className="custom-field-builder">
            <div className="form-row">
              <div className="form-group">
                <label>Field Label</label>
                <input
                  type="text"
                  value={newField.label}
                  onChange={(e) => handleFieldChange('label', e.target.value)}
                  placeholder="e.g., T-Shirt Size"
                />
              </div>

              <div className="form-group">
                <label>Field Type</label>
                <select
                  value={newField.type}
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="textarea">Text Area</option>
                  <option value="email">Email</option>
                  <option value="tel">Phone</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Dropdown</option>
                  <option value="radio">Radio Buttons</option>
                  <option value="checkbox">Checkboxes</option>
                  <option value="file">File Upload</option>
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newField.required}
                    onChange={(e) => handleFieldChange('required', e.target.checked)}
                  />
                  Required
                </label>
              </div>
            </div>

            {['select', 'radio', 'checkbox'].includes(newField.type) && (
              <div className="form-group">
                <label>Options</label>
                {newField.options.map((option, index) => (
                  <div key={index} className="option-input">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="btn-remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" onClick={handleAddOption} className="btn-secondary-small">
                  + Add Option
                </button>
              </div>
            )}

            <button type="button" onClick={handleAddCustomField} className="btn-primary">
              Add Field
            </button>
          </div>

          {customFields.length > 0 && (
            <div className="custom-fields-preview">
              <h3>Custom Fields Preview</h3>
              {customFields.map(field => (
                <div key={field.id} className="field-preview">
                  <div className="field-preview-header">
                    <label>
                      {field.label}
                      {field.required && <span className="required">*</span>}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(field.id)}
                      className="btn-remove"
                    >
                      Remove
                    </button>
                  </div>
                  {renderFieldPreview(field)}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Submit Buttons */}
        <div className="form-actions">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {isEditMode ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventFormBuilder;
