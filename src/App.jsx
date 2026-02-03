import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState } from 'react';
import './App.css';
import EventList from './components/EventList';
import EventForm from './components/EventForm';
import EventDetails from './components/EventDetails';

function App() {
  const [events, setEvents] = useState([
    {
      id: 1,
      title: 'Tech Conference 2026',
      date: '2026-03-15',
      time: '09:00',
      location: 'Convention Center, San Francisco',
      description: 'Annual technology conference featuring the latest innovations in AI and software development.',
      category: 'Technology',
      organizer: 'Tech Events Inc.',
      capacity: 500,
      registered: 234
    },
    {
      id: 2,
      title: 'Music Festival',
      date: '2026-04-20',
      time: '18:00',
      location: 'Central Park, New York',
      description: 'Summer music festival featuring local and international artists.',
      category: 'Entertainment',
      organizer: 'Live Nation',
      capacity: 1000,
      registered: 678
    },
    {
      id: 3,
      title: 'Food & Wine Expo',
      date: '2026-05-10',
      time: '12:00',
      location: 'Downtown Convention Hall',
      description: 'Explore culinary delights from around the world with renowned chefs.',
      category: 'Food & Drink',
      organizer: 'Culinary Arts Society',
      capacity: 300,
      registered: 145
    }
  ]);

  const addEvent = (newEvent) => {
    setEvents([...events, { ...newEvent, id: Date.now(), registered: 0 }]);
  };

  const updateEvent = (id, updatedEvent) => {
    setEvents(events.map(event => 
      event.id === id ? { ...event, ...updatedEvent } : event
    ));
  };

  const deleteEvent = (id) => {
    setEvents(events.filter(event => event.id !== id));
  };

  const registerForEvent = (id) => {
    setEvents(events.map(event => 
      event.id === id && event.registered < event.capacity
        ? { ...event, registered: event.registered + 1 }
        : event
    ));
  };

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="container">
            <h1 className="logo">
              <Link to="/">📅 EventHub</Link>
            </h1>
            <nav className="nav">
              <Link to="/" className="nav-link">Events</Link>
              <Link to="/create" className="nav-link">Create Event</Link>
            </nav>
          </div>
        </header>

        <main className="main-content">
          <div className="container">
            <Routes>
              <Route 
                path="/" 
                element={
                  <EventList 
                    events={events} 
                    onDelete={deleteEvent}
                    onRegister={registerForEvent}
                  />
                } 
              />
              <Route 
                path="/create" 
                element={<EventForm onSubmit={addEvent} />} 
              />
              <Route 
                path="/edit/:id" 
                element={
                  <EventForm 
                    events={events} 
                    onSubmit={updateEvent} 
                    isEdit={true}
                  />
                } 
              />
              <Route 
                path="/event/:id" 
                element={
                  <EventDetails 
                    events={events}
                    onRegister={registerForEvent}
                    onDelete={deleteEvent}
                  />
                } 
              />
            </Routes>
          </div>
        </main>

      </div>
    </Router>
  );
}

export default App;
