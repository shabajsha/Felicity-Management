import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import EventCard from './EventCard';
import { searchEvents, filterEvents, sortEvents } from '../utils/helpers';
import { EVENT_TYPES, ELIGIBILITY_TYPES } from '../utils/constants';
import './EventList.css';

function EventList({ events, onDelete, onRegister }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterEligibility, setFilterEligibility] = useState('All');
  const [sortBy, setSortBy] = useState('date');

  const filteredEvents = useMemo(() => {
    let result = searchEvents(events, searchTerm);
    result = filterEvents(result, { 
      type: filterType !== 'All' ? filterType : null,
      eligibility: filterEligibility !== 'All' ? filterEligibility : null 
    });
    result = sortEvents(result, sortBy);
    return result;
  }, [events, searchTerm, filterType, filterEligibility, sortBy]);

  return (
    <div className="event-list-container">
      <div className="event-list-header">
        <h2>Upcoming Events</h2>
        <p className="subtitle">Discover and join amazing events near you</p>
      </div>

      <div className="controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Types</option>
            <option value={EVENT_TYPES.NORMAL}>Normal Events</option>
            <option value={EVENT_TYPES.MERCHANDISE}>Merchandise</option>
          </select>

          <select 
            value={filterEligibility} 
            onChange={(e) => setFilterEligibility(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Eligibility</option>
            <option value={ELIGIBILITY_TYPES.ALL}>All Participants</option>
            <option value={ELIGIBILITY_TYPES.IIIT_ONLY}>IIIT Only</option>
            <option value={ELIGIBILITY_TYPES.EXTERNAL_ONLY}>External Only</option>
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
            <option value="capacity">Sort by Capacity</option>
          </select>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="no-events">
          <p>No events found. Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="events-grid">
          {filteredEvents.map(event => (
            <EventCard 
              key={event.id} 
              event={event}
              onDelete={onDelete}
              onRegister={onRegister}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default EventList;
