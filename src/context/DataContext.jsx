import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { STORAGE_KEYS, EVENT_STATUS, REGISTRATION_STATUS } from '../utils/constants';
import { MOCK_EVENTS, MOCK_ORGANIZERS, MOCK_USERS, generateMockEvents } from '../utils/mockData';
import { generateId, generateTicketId } from '../utils/helpers';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // Initialize events from localStorage or use mock data
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Error parsing events from localStorage:', err);
      }
    }
    return generateMockEvents(15); // Generate 15 additional mock events
  });

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

  const [registrations, setRegistrations] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Error parsing registrations from localStorage:', err);
      }
    }
    return [];
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
  }, [registrations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  // Event Management
  const addEvent = (eventData) => {
    const newEvent = {
      ...eventData,
      id: generateId(),
      registered: 0,
      capacity: eventData.maxParticipants || eventData.capacity || 50,
      status: EVENT_STATUS.PUBLISHED,
      createdAt: new Date().toISOString(),
    };
    setEvents(prev => [...prev, newEvent]);
    return newEvent.id;
  };

  const updateEvent = (id, updates) => {
    setEvents(prev =>
      prev.map(event => (event.id === id ? { ...event, ...updates } : event))
    );
  };

  const deleteEvent = (id) => {
    setEvents(prev => prev.filter(event => event.id !== id));
    // Also remove related registrations
    setRegistrations(prev => prev.filter(reg => reg.eventId !== id));
  };

  const getEventById = (id) => {
    return events.find(event => event.id === id || event.id === parseInt(id));
  };

  // Registration Management
  const registerForEvent = (userId, eventId, formData = {}) => {
    const event = getEventById(eventId);
    if (!event) return { success: false, message: 'Event not found' };

    if (event.registered >= event.capacity) {
      return { success: false, message: 'Event is full' };
    }

    // Check if already registered
    const existing = registrations.find(
      r => r.userId === userId && r.eventId === eventId
    );
    if (existing) {
      return { success: false, message: 'Already registered for this event' };
    }

    // Get user information
    const user = getUserById(userId);
    const userName = user?.name || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Unknown');
    const userPhone = user?.phone || user?.phoneNumber || user?.contactNumber || '';

    const newRegistration = {
      id: generateId(),
      userId,
      eventId,
      participantName: userName,
      email: user?.email || '',
      phone: userPhone,
      ticketId: generateTicketId(),
      registeredAt: new Date().toISOString(),
      registrationDate: new Date().toISOString(),
      status: event.requiresApproval ? 'pending' : REGISTRATION_STATUS.CONFIRMED,
      paymentStatus: event.registrationFee > 0 ? 'Paid' : 'Free',
      amount: event.registrationFee || 0,
      customFormData: formData,
    };

    setRegistrations(prev => [...prev, newRegistration]);
    
    // Increment event registered count
    updateEvent(eventId, { registered: event.registered + 1 });

    return { success: true, registration: newRegistration };
  };

  const cancelRegistration = (registrationId) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return { success: false, message: 'Registration not found' };

    setRegistrations(prev =>
      prev.map(reg =>
        reg.id === registrationId
          ? { ...reg, status: REGISTRATION_STATUS.CANCELLED }
          : reg
      )
    );

    // Decrement event registered count
    const event = getEventById(registration.eventId);
    if (event && event.registered > 0) {
      updateEvent(registration.eventId, { registered: event.registered - 1 });
    }

    return { success: true };
  };

  const getUserRegistrations = (userId) => {
    return registrations.filter(reg => reg.userId === userId);
  };

  const getEventRegistrations = (eventId) => {
    return registrations.filter(reg => reg.eventId === eventId);
  };

  const updateRegistration = (id, updates) => {
    setRegistrations(prev =>
      prev.map(reg => (reg.id === id || reg.id === parseInt(id) ? { ...reg, ...updates } : reg))
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
    [events, organizers, users, registrations]
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
