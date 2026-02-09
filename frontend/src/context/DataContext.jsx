import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { STORAGE_KEYS, EVENT_STATUS, REGISTRATION_STATUS } from '../utils/constants';
import { MOCK_EVENTS, MOCK_ORGANIZERS, MOCK_USERS, generateMockEvents } from '../utils/mockData';
import { generateId, generateTicketId } from '../utils/helpers';
import { eventsAPI, registrationsAPI, clubsAPI } from '../utils/api';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // Initialize events from API instead of localStorage
  const [events, setEvents] = useState([]);
  const [organizers, setOrganizers] = useState(MOCK_ORGANIZERS);
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Error parsing users from localStorage:', err);
      }
    }
    return MOCK_USERS;
  });
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch events from backend on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventsAPI.getAllEvents();
        if (response.success) {
          const normalized = (response.data || []).map(evt => ({
            ...evt,
            id: evt._id || evt.id
          }));
          setEvents(normalized);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Persist to localStorage (only for users, events managed by API)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  // Event Management - Now using API
  const addEvent = async (eventData) => {
    try {
      const response = await eventsAPI.createEvent(eventData);
      if (response.success) {
        const newEvent = {
          ...response.data,
          id: response.data._id || response.data.id
        };
        setEvents(prev => [...prev, newEvent]);
        return newEvent._id || newEvent.id;
      }
    } catch (err) {
      console.error('Error creating event:', err);
    }
    return null;
  };

  const updateEvent = async (id, updates) => {
    try {
      const response = await eventsAPI.updateEvent(id, updates);
      if (response.success) {
        setEvents(prev =>
          prev.map(event => 
            (event._id === id || event.id === id) 
              ? { ...event, ...response.data, id: response.data._id || response.data.id || event.id } 
              : event
          )
        );
      }
    } catch (err) {
      console.error('Error updating event:', err);
    }
  };

  const deleteEvent = async (id) => {
    try {
      const response = await eventsAPI.deleteEvent(id);
      if (response.success) {
        setEvents(prev => prev.filter(event => event._id !== id && event.id !== id));
        setRegistrations(prev => prev.filter(reg => reg.eventId !== id));
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const getEventById = (id) => {
    return events.find(event => 
      event._id === id || event.id === id || 
      event._id === parseInt(id) || event.id === parseInt(id)
    );
  };

  // Registration Management - Now using API
  const registerForEvent = async (userId, eventId, formData = {}) => {
    try {
      const response = await registrationsAPI.registerForEvent(eventId, formData);
      if (response.success) {
        const registration = response.data;
        setRegistrations(prev => [...prev, registration]);
        
        // Update event registered count locally
        setEvents(prev => prev.map(event => {
          if (event._id === eventId || event.id === eventId) {
            return { ...event, registered: (event.registered || 0) + 1 };
          }
          return event;
        }));
        
        return { success: true, registration };
      } else {
        return { success: false, message: response.message };
      }
    } catch (err) {
      console.error('Error registering for event:', err);
      return { success: false, message: 'Failed to register for event' };
    }
  };

  const cancelRegistration = async (registrationId) => {
    try {
      const response = await registrationsAPI.cancelRegistration(registrationId);
      if (response.success) {
        setRegistrations(prev =>
          prev.map(reg =>
            reg._id === registrationId || reg.id === registrationId
              ? { ...reg, status: REGISTRATION_STATUS.CANCELLED }
              : reg
          )
        );
        return { success: true };
      }
    } catch (err) {
      console.error('Error cancelling registration:', err);
      return { success: false, message: 'Failed to cancel registration' };
    }
  };

  const getUserRegistrations = async (userId) => {
    try {
      const response = await registrationsAPI.getUserRegistrations();
      if (response.success) {
        return response.data || [];
      }
    } catch (err) {
      console.error('Error fetching user registrations:', err);
    }
    return [];
  };

  const getEventRegistrations = async (eventId) => {
    try {
      const response = await registrationsAPI.getEventRegistrations(eventId);
      if (response.success) {
        return response.data || [];
      }
    } catch (err) {
      console.error('Error fetching event registrations:', err);
    }
    return [];
  };

  const updateRegistration = (id, updates) => {
    setRegistrations(prev =>
      prev.map(reg => 
        (reg._id === id || reg.id === id || reg._id === parseInt(id) || reg.id === parseInt(id)) 
          ? { ...reg, ...updates } 
          : reg
      )
    );
  };

  // Organizer Management
  const addOrganizer = (organizerData) => {
    const newOrganizer = {
      ...organizerData,
      id: generateId(),
      followers: 0,
      totalEvents: 0,
      upcomingEvents: 0,
    };
    setOrganizers(prev => [...prev, newOrganizer]);
    return newOrganizer;
  };

  const updateOrganizer = (id, updates) => {
    setOrganizers(prev =>
      prev.map(org => (org.id === id ? { ...org, ...updates } : org))
    );
  };

  const deleteOrganizer = (id) => {
    setOrganizers(prev => prev.filter(org => org.id !== id));
  };

  const getOrganizerById = (id) => {
    return organizers.find(org => org.id === id || org.id === parseInt(id));
  };

  // User Management
  const addUser = (userData) => {
    const newUser = {
      ...userData,
      id: generateId(),
      joinedAt: new Date().toISOString(),
      isActive: true,
    };
    setUsers(prev => [...prev, newUser]);
    return newUser.id;
  };

  const updateUser = (id, updates) => {
    setUsers(prev =>
      prev.map(user => (user.id === id || user.id === parseInt(id) ? { ...user, ...updates } : user))
    );
  };

  const deleteUser = (id) => {
    setUsers(prev => prev.filter(user => user.id !== id && user.id !== parseInt(id)));
  };

  const getUserById = (id) => {
    return users.find(user => user.id === id || user.id === parseInt(id));
  };

  const value = useMemo(
    () => ({
      events,
      organizers,
      users,
      registrations,
      loading,
      addEvent,
      updateEvent,
      deleteEvent,
      getEventById,
      registerForEvent,
      cancelRegistration,
      getUserRegistrations,
      getEventRegistrations,
      updateRegistration,
      addOrganizer,
      updateOrganizer,
      deleteOrganizer,
      getOrganizerById,
      addUser,
      updateUser,
      deleteUser,
      getUserById,
    }),
    [events, organizers, users, registrations, loading]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
