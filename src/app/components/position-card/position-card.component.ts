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

  // Google Maps-style coords: "14.924927, 120.205933" — labels removed per spec
  formatted = computed(() => {
    const p = this.position();
    if (!p || (p.lat === 0 && p.lng === 0)) return 'No position yet';
    return `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
  });

  // universal Google Maps link — OS intercepts https → app chooser (no geo: needed)
  // keeps desktop safe (no about:blank) and avoids popup-blocker on fallback
  mapsUrl = computed(() => {
    const p = this.position();
    if (!p || (p.lat === 0 && p.lng === 0)) return '';
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  });
}
