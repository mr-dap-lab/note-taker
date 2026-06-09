/**
 * Logging Service
 * 
 * JUNIOR DEV NOTE:
 * This service demonstrates a "Telemetry" implementation.
 * When users are not logged in (Guest Mode), we can't save their data to a user account.
 * However, product managers still want to know how people are using the app.
 * We send "Anonymous Events" to a backend server to track metrics like "How many guests recorded a meeting?".
 */

// Structure of the log event sent to the analytics backend
export interface LogEvent {
  event: string;                   // Name of the event (e.g., 'RECORDING_COMPLETED')
  timestamp: string;               // ISO String of when the event occurred
  metadata: Record<string, any>;   // Arbitrary data associated with the event
  userAgent: string;               // Browser/Device information
}

/**
 * Logs activity for unauthenticated (guest) users.
 * 
 * @param eventName - A unique string identifier for the event.
 * @param metadata - An object containing relevant data (recording ID, duration, etc.).
 * @returns Promise<boolean> - True if logged successfully (simulated), false otherwise.
 */
export const logGuestActivity = async (eventName: string, metadata: Record<string, any>) => {
  const payload: LogEvent = {
    event: eventName,
    timestamp: new Date().toISOString(),
    metadata,
    userAgent: navigator.userAgent
  };

  // Simulate sending data to an analytics/logging endpoint (e.g., Splunk, Datadog, or a proprietary DB).
  // In a production environment, this would be a POST request to a specialized endpoint.
  console.groupCollapsed(`[ANALYTICS] Guest Activity: ${eventName}`);
  console.log("Payload:", payload);
  console.log("Status: Queued for upload");
  console.groupEnd();

  try {
    // ACTUAL IMPLEMENTATION EXAMPLE:
    // await fetch('https://api.app-analytics.com/v1/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // });
    return true;
  } catch (error) {
    // Fail silently to avoid interrupting the user experience
    console.warn("Failed to log guest activity", error);
    return false;
  }
};