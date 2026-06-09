/**
 * Notification Service
 * 
 * JUNIOR DEV NOTE:
 * This service handles Browser Notifications (the little popups you see in OS corners).
 * Why do we need this? 
 * AI Transcription takes time (10-30 seconds). A user might switch tabs while waiting.
 * Notifications allow us to alert them ("Transcript Ready!") even if they aren't looking at our tab.
 */

export const requestNotificationPermission = async (): Promise<boolean> => {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    console.warn('Notifications not supported in this browser');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  try {
    // This prompts the user "Allow this site to send notifications?"
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return false;
  }
};

export const sendNotification = (title: string, body: string) => {
  if (!('Notification' in window)) return;

  // Respect user preference in options
  const enabledPref = localStorage.getItem('pref_notifications_enabled') !== 'false';
  if (!enabledPref) {
    console.log("Notification suppressed: user has disabled notifications in settings.");
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/vite.svg', // Uses the app icon
        silent: false,
      });
    } catch (e) {
      console.error('Error sending notification:', e);
    }
  }
};

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};