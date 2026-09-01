import { Component, effect, inject, signal, OnDestroy, AfterViewInit } from '@angular/core';
import { Geo } from '../services/geo';
import * as L from 'leaflet';
import { LoadingController } from '@ionic/angular';
import { IonContent, IonButton, IonAlert } from '@ionic/angular';
import { PositionCardComponent } from '../components/position-card/position-card.component';

// HomePage — map + bottom sheet (WP flow: Start -> getCurrentPosition -> Track -> watchPosition)
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, IonButton, IonAlert, PositionCardComponent],
})
export class HomePage implements OnDestroy, AfterViewInit {
  // injections
  GeolocationService = inject(Geo);
  private loadingController = inject(LoadingController);

  // map state
  map!: L.Map;
  latlng: { lat: number; lng: number } = { lat: 0, lng: 0 };
  lastMarker?: L.CircleMarker;
  distanceLine?: L.Polyline<any>;
  watcherId: string | null = null;

  // ui state
  isDisabled = true;
  isMapVisible = false;
  isAlertOpen = false;
  alertButtons = ['Refresh'];
  trackingIndicator = 'Not tracking';

  // signals
  display_name = signal('');
  distanceFromStart = signal(0);

  // loader handle
  loader?: HTMLIonLoadingElement;

  // alert dismiss — reload resets lab state
  setOpen(isOpen: boolean) {
    this.isAlertOpen = isOpen;
    window.location.reload();
  }

  // one-shot fetch — WP pattern: store coords, defer mapInit(0), then hide loader
  async getCurrentLocation() {
    try {
      const coordinates = await this.GeolocationService.getCurrentLocation();
      this.latlng = coordinates;
      // defer so #map has size (WP uses setTimeout 0)
      setTimeout(() => this.mapInit(), 0);
      await this.hideLoading();
      this.isDisabled = false;
    } catch (error) {
      console.log('errorizing: ', error);
      await this.hideLoading();
      this.isAlertOpen = true;
    }
  }

  // preview map shown immediately before Start — no geolocation needed
  private initPreviewMap() {
    if (this.map) return;
    this.map = L.map('map', {
      center: [14.5995, 120.9842], // Manila — visible land while waiting for GPS
      zoom: 12,
      zoomControl: false,
    });
    L.control.zoom({ position: 'topright' }).addTo(this.map);
    L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_dark/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(this.map);
    // ensure Leaflet measures the 100dvh container after Ionic finishes layout
    requestAnimationFrame(() => this.map.invalidateSize());
    setTimeout(() => this.map.invalidateSize(), 200);
    setTimeout(() => this.map.invalidateSize(), 600);
  }

  ngAfterViewInit() {
    // render map immediately so user sees context before tapping Start
    setTimeout(() => this.initPreviewMap(), 0);
  }

  ionViewDidEnter() {
    // Ionic page transition finished — re-measure in case view was cached
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 100);
    } else {
      this.initPreviewMap();
    }
  }

  // create Leaflet map — CP uses single setTimeout 200 for invalidateSize
  mapInit() {
    // preview map already exists — recenter to real fix and add start marker
    if (this.map) {
      this.map.setView([this.latlng.lat, this.latlng.lng], 19);
      L.circleMarker([this.latlng.lat, this.latlng.lng], {
        radius: 5,
        color: '#00B14F',
      }).addTo(this.map);
      setTimeout(() => {
        this.map.invalidateSize();
      }, 200);
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${this.latlng.lat}&lon=${this.latlng.lng}&format=json`
      )
        .then((res) => res.json())
        .then((data) => {
          L.tooltip([this.latlng.lat, this.latlng.lng], {
            content: data.address?.village ?? data.address?.city ?? data.display_name,
          }).addTo(this.map);
          this.display_name.set(data.display_name);
        })
        .catch(() => {
          this.display_name.set(`${this.latlng.lat.toFixed(6)}, ${this.latlng.lng.toFixed(6)}`);
        });
      return;
    }

    this.map = L.map('map', {
      center: [this.latlng.lat, this.latlng.lng],
      zoom: 19,
      zoomControl: false, // manual so position is explicit
    });
    // change position to 'topleft' | 'topright' | 'bottomleft' | 'bottomright'
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_dark/{z}/{x}/{y}{r}.png').addTo(this.map);
    L.circleMarker([this.latlng.lat, this.latlng.lng], {
      radius: 5,
      color: '#00B14F',
    }).addTo(this.map);

    // CP fix: single invalidate after Ionic layout settles
    setTimeout(() => {
      this.map.invalidateSize();
    }, 200);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${this.latlng.lat}&lon=${this.latlng.lng}&format=json`
    )
      .then((res) => res.json())
      .then((data) => {
        L.tooltip([this.latlng.lat, this.latlng.lng], {
          content: data.address?.village ?? data.address?.city ?? data.display_name,
        }).addTo(this.map);
        this.display_name.set(data.display_name);
      })
      .catch(() => {
        this.display_name.set(`${this.latlng.lat.toFixed(6)}, ${this.latlng.lng.toFixed(6)}`);
      });
  }

  // watchPosition effect — creates blue marker + green polyline + distance
  constructor() {
    effect(() => {
      const pos = this.GeolocationService.movingPosition();
      if (pos && this.map) {
        const startLatLng = L.latLng(this.latlng.lat, this.latlng.lng);
        const movingLatLng = L.latLng(pos.lat, pos.lng);
        if (!this.lastMarker) {
          this.lastMarker = L.circleMarker([pos.lat, pos.lng], {
            radius: 5,
            color: 'blue',
          }).addTo(this.map);
        } else {
          this.lastMarker.setLatLng([pos.lat, pos.lng]);
        }
        const distance = startLatLng.distanceTo(movingLatLng);
        this.distanceFromStart.set(distance);
        if (!this.distanceLine) {
          this.distanceLine = L.polyline([startLatLng, movingLatLng], {
            color: 'green',
          }).addTo(this.map);
          this.distanceLine
            .bindTooltip(`${distance.toFixed(2)} m`, {
              permanent: true,
              direction: 'center',
              className: 'distance-tooltip',
            })
            .openTooltip();
        } else {
          this.distanceLine.setLatLngs([startLatLng, movingLatLng]);
          const tooltip = this.distanceLine.getTooltip();
          if (tooltip) {
            tooltip.setContent(`${distance.toFixed(2)} m`);
          }
        }
        this.map.panTo([pos.lat, pos.lng]);
      }
    });
  }

  async showLoading() {
    this.loader = await this.loadingController.create({
      message: 'Please wait',
    });
    await this.loader.present();
  }

  async hideLoading() {
    if (this.loader) {
      await this.loader.dismiss();
      this.loader = undefined;
    }
  }

  showMap() {
    this.showLoading();
    void this.getCurrentLocation();
    this.isMapVisible = true;
  }

  async startTracking() {
    // guard double tap
    if (this.watcherId) return;
    this.watcherId = await this.GeolocationService.watchPosition();
    this.trackingIndicator = 'Tracking';
  }

  async stopWatching() {
    if (this.watcherId) {
      await this.GeolocationService.clearWatch(this.watcherId);
      this.watcherId = null;
      this.trackingIndicator = 'Stopped';
    }
  }

  async ngOnDestroy() {
    if (this.watcherId) {
      await this.GeolocationService.clearWatch(this.watcherId);
      this.watcherId = null;
    }
  }
}
