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
  // start (green A) — required, 0,0 = not ready
  position = input.required<{ lat: number; lng: number } | null>();
  displayName = input<string>('');
  // live (blue B) — null until Track emits
  currentPosition = input<{ lat: number; lng: number } | null>(null);
  currentDisplayName = input<string>('');
  status = input<string>('');
  distance = input<number | null>(null);

  // start coords
  formatted = computed(() => {
    const p = this.position();
    if (!p || (p.lat === 0 && p.lng === 0)) return 'No position yet';
    return `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
  });

  mapsUrl = computed(() => {
    const p = this.position();
    if (!p || (p.lat === 0 && p.lng === 0)) return '';
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  });

  // live coords
  formattedCurrent = computed(() => {
    const p = this.currentPosition();
    if (!p || (p.lat === 0 && p.lng === 0)) return '';
    return `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
  });

  mapsUrlCurrent = computed(() => {
    const p = this.currentPosition();
    if (!p || (p.lat === 0 && p.lng === 0)) return '';
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  });
}
