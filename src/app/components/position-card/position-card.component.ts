import { Component, input, computed } from '@angular/core';
import { IonCard, IonLabel } from '@ionic/angular';

// PositionCard — glass info card with merged Status/Distance
@Component({
  selector: 'app-position-card',
  templateUrl: './position-card.component.html',
  styleUrls: ['./position-card.component.scss'],
  imports: [IonCard, IonLabel],
})
export class PositionCardComponent {
  position = input.required<{ lat: number; lng: number } | null>();
  displayName = input<string>('');
  status = input<string>('');
  distance = input<number | null>(null);

  // formatted lat/lng, toFixed(6) ~10cm
  formatted = computed(() => {
    const p = this.position();
    if (!p || (p.lat === 0 && p.lng === 0)) return 'No position yet';
    return `Latitude: ${p.lat.toFixed(6)}  Longitude: ${p.lng.toFixed(6)}`;
  });
}
