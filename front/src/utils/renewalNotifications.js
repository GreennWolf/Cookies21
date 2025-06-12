// Utility para gestionar notificaciones de renovación en tiempo real

class RenewalNotificationManager {
  constructor() {
    this.listeners = [];
  }

  // Suscribirse a cambios de notificaciones
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notificar a todos los listeners que se actualicen
  notifyUpdate() {
    this.listeners.forEach(callback => callback());
  }

  // Métodos específicos para eventos
  onSubscriptionReactivated() {
    this.notifyUpdate();
  }

  onRenewalRequestCreated() {
    this.notifyUpdate();
  }

  onRenewalRequestCompleted() {
    this.notifyUpdate();
  }
}

export const renewalNotificationManager = new RenewalNotificationManager();