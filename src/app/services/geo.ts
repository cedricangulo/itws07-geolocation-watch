import { Injectable, signal } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

// Geo service — wraps Capacitor Geolocation, exposes movingPosition signal for effect()
@Injectable({
  providedIn: 'root',
})
export class Geo {
  // latest watch fix, null = no fix yet
  movingPosition = signal<{ lat: number; lng: number } | null>(null);

  // one-shot: Geolocation.getCurrentPosition with high accuracy
  async getCurrentLocation() {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
  }

  // watch: pushes each fix into movingPosition signal
  async watchPosition() {
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
      },
      (pos) => {
        if (pos) {
          this.movingPosition.set({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      }
    );
    return watchId;
  }

  // clear native watch
  async clearWatch(watchId: string) {
    await Geolocation.clearWatch({ id: watchId });
  }
}
