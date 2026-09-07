import { Injectable, signal } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

@Injectable({
  providedIn: 'root',
})
export class Geo {
  // latest watch fix, null = no fix yet
  movingPosition = signal<{ lat: number; lng: number } | null>(null);

  // get current location
  async getCurrentLocation() {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true, // use GPS
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
  }

  // watch position
  async watchPosition() {
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true, // use GPS
      },
      (pos) => {
        // skip null fixes
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

  // clear watch
  async clearWatch(watchId: string) {
    await Geolocation.clearWatch({ id: watchId });
  }
}
