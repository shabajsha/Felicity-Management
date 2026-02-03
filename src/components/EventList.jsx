import { useState } from 'react';
import { Link } from 'react-router-dom';
import EventCard from './EventCard';
import './EventList.css';

function EventList({ events, onDelete, onRegister }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState('date');

  const categories = ['All', ...new Set(events.map(event => event.category))];

  const filteredEvents = events
    .filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          event.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || event.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(a.date) - new Date(b.date);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'capacity') {
        return b.capacity - a.capacity;
      }
      return 0;
    });

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
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
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
