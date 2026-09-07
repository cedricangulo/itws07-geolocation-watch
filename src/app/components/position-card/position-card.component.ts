// position card - glass info card for bottom sheet
import { Component, input, computed } from '@angular/core';
import { IonCard, IonLabel } from '@ionic/angular';

@Component({
  selector: 'app-position-card',
  templateUrl: './position-card.component.html',
  styleUrls: ['./position-card.component.scss'],
  imports: [IonCard, IonLabel],
})
export class PositionCardComponent {
  // inputs
  position = input.required<{ lat: number; lng: number } | null>();   // start position
  currentPosition = input<{ lat: number; lng: number } | null>(null); // live position
  displayName = input<string>('');                                    // start address
  currentDisplayName = input<string>('');                             // live address
  status = input<string>('');                                         // tracking status
  distance = input<number | null>(null);                              // distance in meters

  // start coords text
  formatted = computed(() => {
    const startPos = this.position();
    if (!startPos || (startPos.lat === 0 && startPos.lng === 0)) return 'No position yet'; // no start position yet
    return `${startPos.lat.toFixed(6)}, ${startPos.lng.toFixed(6)}`;
  });

  // start maps url
  mapsUrl = computed(() => {
    const startPos = this.position();
    if (!startPos || (startPos.lat === 0 && startPos.lng === 0)) return ''; // no start position yet
    return `https://www.google.com/maps/search/?api=1&query=${startPos.lat},${startPos.lng}`;
  });

  // live coords text
  formattedCurrent = computed(() => {
    const livePos = this.currentPosition();
    if (!livePos || (livePos.lat === 0 && livePos.lng === 0)) return ''; // no live position yet
    return `${livePos.lat.toFixed(6)}, ${livePos.lng.toFixed(6)}`;
  });

  // live maps url
  mapsUrlCurrent = computed(() => {
    const livePos = this.currentPosition();
    if (!livePos || (livePos.lat === 0 && livePos.lng === 0)) return ''; // no live position yet
    return `https://www.google.com/maps/search/?api=1&query=${livePos.lat},${livePos.lng}`;
  });
}
