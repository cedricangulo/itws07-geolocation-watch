import { Component, input } from '@angular/core';
import { IonToolbar, IonTitle, IonLabel } from '@ionic/angular';

/**
 * StatusBannerComponent — legacy standalone pill for tracking status.
 *
 * Current usage:
 * - Initially rendered in HomePage's ion-footer; now retired from the main
 *   view — HomePage merges Status + Distance directly into PositionCard.
 * - Kept for backwards compatibility and potential reuse elsewhere (e.g. tabs
 *   or a minimal header variant). If reintroduced, its glass pill styling
 *   matches the controls pill (see .scss).
 *
 * Inputs:
 * - status: "Not tracking" | "Tracking" | "Stopped"
 * - distance: meters from start (formatted toFixed(2) in template)
 */
@Component({
  selector: 'app-status-banner',
  templateUrl: './status-banner.component.html',
  styleUrls: ['./status-banner.component.scss'],
  imports: [IonToolbar, IonTitle, IonLabel],
})
export class StatusBannerComponent {
  // Tracking state label — required so parent must explicitly pass a value
  status = input.required<string>();
  // Distance in meters — required; parent formats display
  distance = input.required<number>();
}
