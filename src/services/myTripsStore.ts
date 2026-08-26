import { MyTrip, RiverRoute, AppUser } from '../types';
import { generateContextualChecklist } from '../utils/checklistGenerator';

const STORAGE_KEY = 'splav86_my_trips_v1';

export class MyTripsStore {
  static getMyTrips(userId?: string): MyTrip[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const list: MyTrip[] = JSON.parse(stored);
      if (!Array.isArray(list)) return [];
      if (userId) {
        return list.filter((t) => t.userId === userId || t.userId === 'local_guest');
      }
      return list;
    } catch {
      return [];
    }
  }

  static getTripById(tripId: string): MyTrip | null {
    const list = this.getMyTrips();
    return list.find((t) => t.id === tripId) || null;
  }

  static saveTrip(trip: MyTrip): MyTrip {
    const list = this.getMyTrips();
    const idx = list.findIndex((t) => t.id === trip.id);
    const updatedTrip = { ...trip, updatedAt: new Date().toISOString() };

    if (idx >= 0) {
      list[idx] = updatedTrip;
    } else {
      list.unshift(updatedTrip);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save trip to storage', e);
    }

    return updatedTrip;
  }

  static createFromRoute(route: RiverRoute, user?: AppUser | null, customDates?: { start: string; end: string }): MyTrip {
    const now = new Date();
    const startDate = customDates?.start || new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const durationDays = route.durationDays || 3;
    const endDate = customDates?.end || new Date(new Date(startDate).getTime() + (durationDays - 1) * 24 * 3600 * 1000).toISOString().split('T')[0];

    const checklistSections = generateContextualChecklist(route);

    const newTrip: MyTrip = {
      id: `mytrip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: user?.id || 'local_guest',
      routeId: route.id,
      routeName: route.name,
      riverName: route.riverName,
      region: route.region,
      fstrCategory: route.fstrCategory || 'I к.с.',
      startDate,
      endDate,
      durationDays,
      vessels: route.recommendedVessels || ['kayak'],
      participants: user ? [{
        id: user.id,
        name: user.name,
        role: 'Руководитель',
        phone: user.phone,
        isConfirmed: true
      }] : [{
        id: 'guest-1',
        name: 'Руководитель группы',
        role: 'Руководитель',
        isConfirmed: true
      }],
      checklistSections,
      checkpoints: [
        {
          id: 'cp-start',
          name: `Старт: ${route.startPoint.name}`,
          date: startDate,
          time: '10:00',
          lat: route.startPoint.lat,
          lng: route.startPoint.lng,
          passed: false
        },
        {
          id: 'cp-end',
          name: `Финиш: ${route.endPoint.name}`,
          date: endDate,
          time: '18:00',
          lat: route.endPoint.lat,
          lng: route.endPoint.lng,
          passed: false
        }
      ],
      emergencyContact: user?.emergencyContact ? {
        name: user.emergencyContact.name,
        phone: user.emergencyContact.phone,
        relation: user.emergencyContact.relation
      } : undefined,
      mchsRegistered: false,
      gpxFileName: route.gpxFileName,
      status: 'planning',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return this.saveTrip(newTrip);
  }

  static deleteTrip(tripId: string): void {
    const list = this.getMyTrips().filter((t) => t.id !== tripId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to delete trip from storage', e);
    }
  }

  static calculateProgress(trip: MyTrip): { percent: number; completedCount: number; totalCount: number } {
    let total = 0;
    let completed = 0;

    trip.checklistSections.forEach((section) => {
      section.items.forEach((item) => {
        total++;
        if (item.completed) completed++;
      });
    });

    if (trip.mchsRegistered) {
      total++;
      completed++;
    } else {
      total++;
    }

    if (trip.emergencyContact?.name && trip.emergencyContact?.phone) {
      total++;
      completed++;
    } else {
      total++;
    }

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { percent, completedCount: completed, totalCount: total };
  }
}
