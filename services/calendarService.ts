import { User } from '../types';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  provider: 'zoom' | 'teams' | 'google';
  isLive: boolean;
}

/**
 * Simulates fetching scheduled calendar events from the active providers
 * if the user has authenticated their accounts.
 */
export const getCalendarEventsForUser = (user: User | null): CalendarEvent[] => {
  if (!user) return [];
  
  const connectedProviders = user.connectedAccounts
    ?.filter(a => a.connected)
    .map(a => a.provider) || [];
    
  if (connectedProviders.length === 0) return [];
  
  const events: CalendarEvent[] = [];
  
  if (connectedProviders.includes('google')) {
    events.push(
      {
        id: 'g-101',
        title: 'Quarterly Executive Alignment Rally',
        startTime: 'Happening Now',
        provider: 'google',
        isLive: true
      },
      {
        id: 'g-102',
        title: 'Product Roadmap & AI Strategy Sync',
        startTime: 'Today, 2:00 PM',
        provider: 'google',
        isLive: false
      }
    );
  }
  
  if (connectedProviders.includes('zoom')) {
    events.push(
      {
        id: 'z-101',
        title: 'Monthly Board Alignment & Budget Approvals',
        startTime: 'Happening Now',
        provider: 'zoom',
        isLive: true
      },
      {
        id: 'z-102',
        title: 'Weekly Manager-Board Catchup',
        startTime: 'Tomorrow, 10:00 AM',
        provider: 'zoom',
        isLive: false
      }
    );
  }
  
  if (connectedProviders.includes('teams')) {
    events.push(
      {
        id: 't-101',
        title: 'Q2 Financial Audit & Reserves Review',
        startTime: 'Happening Now',
        provider: 'teams',
        isLive: true
      },
      {
        id: 't-102',
        title: 'Building B Elevator Maintenance Proposal Sync',
        startTime: 'Tomorrow, 11:30 AM',
        provider: 'teams',
        isLive: false
      }
    );
  }
  
  return events;
};

/**
 * Evaluates the connected providers under the user's account and suggests
 * a matching live or upcoming meeting title.
 */
export const getCalendarSuggestedTitle = (user: User | null): string | null => {
  const events = getCalendarEventsForUser(user);
  if (events.length === 0) return null;
  // Prefer live meeting
  const liveEvent = events.find(e => e.isLive);
  if (liveEvent) {
    return liveEvent.title;
  }
  // Otherwise default to first available scheduled meeting
  return events[0].title;
};
