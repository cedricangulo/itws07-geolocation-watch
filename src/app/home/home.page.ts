import { Component, effect, inject, signal, OnDestroy, AfterViewInit } from '@angular/core';
import { Geo } from '../services/geo';
import * as L from 'leaflet';
import { LoadingController } from '@ionic/angular';
import { IonContent, IonButton, IonAlert } from '@ionic/angular';
import { PositionCardComponent } from '../components/position-card/position-card.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, IonButton, IonAlert, PositionCardComponent],
})
export class HomePage implements OnDestroy, AfterViewInit {
  // injections
  private GeolocationService = inject(Geo);               // geolocation service
  private loadingController = inject(LoadingController);  // loading controller

  // map state
  map!: L.Map;
  latlng: { lat: number; lng: number } = { lat: 0, lng: 0 };
  startMarker?: L.CircleMarker;     // start marker A
  lastMarker?: L.CircleMarker;      // current marker B
  distanceLine?: L.Polyline<any>;   // line A to B
  watcherId: string | null = null;  // watch id

  // ui state
  isDisabled = true;
  isMapVisible = false;
  isAlertOpen = false;
  alertButtons = ['Refresh'];
  trackingIndicator = 'Not tracking'; // "Not tracking" | "Tracking" | "Stopped"

  // signals
  display_name = signal('');                                // start address
  currentDisplayName = signal('');                          // live address
  distanceFromStart = signal(0);                            // distance in meters
  movingPosition = this.GeolocationService.movingPosition;  // live position signal

  // throttling
  private lastReverseAt = 0;                                          // last live reverse time
  private lastReversePos: { lat: number; lng: number } | null = null; // last live reverse position (10m gate)
  private pendingLivePos: { lat: number; lng: number } | null = null; // buffered fix before map ready
  private startReverseId = 0;                                         // id to ignore old start requests
  private liveReverseId = 0;                                          // id to ignore old live requests
  private liveAbort?: AbortController;                                // cancels in-flight live reverse

  // loading element
  loader?: HTMLIonLoadingElement;

  // close error alert
  setOpen(isOpen: boolean) {
    this.isAlertOpen = isOpen;
    window.location.reload(); // reload
  }

  // load start location
  async loadStartLocation() {
    try {
      const coordinates = await this.GeolocationService.getCurrentLocation();
      this.latlng = coordinates;
      // wait for layout
      setTimeout(() => this.mapInit(), 0);
      this.isDisabled = false; // enable track
      await this.hideLoading();
    } catch (error) {
      console.log('errorizing: ', error);
      await this.hideLoading();
      this.isAlertOpen = true; // show error
    }
  }

  // fetch start address
  private async fetchStartAddress(lat: number, lng: number) {
    const id = ++this.startReverseId; // save id
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
        headers: { 'Accept-Language': 'en' },
      });
      if (!response.ok) throw new Error(`reverse ${response.status}`);
      const data = await response.json();
      if (id !== this.startReverseId) return; // skip if stale
      this.display_name.set(data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {
      if (id !== this.startReverseId) return; // skip if stale
      this.display_name.set(`${lat.toFixed(6)}, ${lng.toFixed(6)}`); // fallback to coords
    }
  }

  // fetch live address
  private async fetchLiveAddress(lat: number, lng: number, id: number, signal: AbortSignal) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
        headers: { 'Accept-Language': 'en' },
        signal,
      });
      if (!response.ok) throw new Error(`reverse ${response.status}`);
      const data = await response.json();
      if (id !== this.liveReverseId) return; // skip if stale
      this.currentDisplayName.set(data.display_name || '');
    } catch (error) {
      if ((error as Error).name === 'AbortError') return; // ignore abort
      if (id !== this.liveReverseId) return; // skip if stale
      this.currentDisplayName.set(''); // clear on error
    }
  }

  // preview map
  private initPreviewMap() {
    if (this.map) return;
    this.map = L.map('map', {
      center: [15.4865, 120.9675], // Cabanatuan City
      zoom: 13,
      zoomControl: false,
    });
    this.map
      .addControl(L.control.zoom({ position: 'topright' }))
      .addLayer(L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_dark/{z}/{x}/{y}{r}.png', { 
        maxZoom: 19
      }));

      // fix map size
    requestAnimationFrame(() => this.map.invalidateSize());
    setTimeout(() => this.map.invalidateSize(), 200);

    // apply pending position
    if (this.pendingLivePos) {
      const pendingPos = this.pendingLivePos;
      this.pendingLivePos = null;
      queueMicrotask(() => this.GeolocationService.movingPosition.set(pendingPos));
    }
  }

  // show preview map after view init
  ngAfterViewInit() {
    // wait for Ionic layout to finish
    setTimeout(() => this.initPreviewMap(), 0);
  }

  // on page enter
  ionViewDidEnter() {
    if (this.map) {
      // re-measure map
      setTimeout(() => this.map.invalidateSize(), 100);
    } else {
      // init preview map
      this.initPreviewMap();
    }
  }

  // init main map
  mapInit() {
    // map exists - recenter
    if (this.map) {
      this.map.setView([this.latlng.lat, this.latlng.lng], 19);

      // remove old marker
      if (this.startMarker) this.map.removeLayer(this.startMarker);

      this.startMarker = L.circleMarker([this.latlng.lat, this.latlng.lng], {
        radius: 5,
        color: '#00B14F',
      })
        .addTo(this.map)
        .bindTooltip('A · Start', {
          permanent: true,
          direction: 'top',
          offset: [0, -10],
          className: 'start-tooltip',
        })
        .openTooltip();

      setTimeout(() => {
        this.map.invalidateSize();
      }, 200);

      // fetch start address
      this.fetchStartAddress(this.latlng.lat, this.latlng.lng);

      // apply pending position
      if (this.pendingLivePos) {
        const pendingPos = this.pendingLivePos;
        this.pendingLivePos = null;
        queueMicrotask(() => this.GeolocationService.movingPosition.set(pendingPos));
      }
      return;
    }

    // create new map
    this.map = L.map('map', {
      center: [this.latlng.lat, this.latlng.lng],
      zoom: 19,
      zoomControl: false, // manual so position is explicit
    });
    // zoom control
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_dark/{z}/{x}/{y}{r}.png').addTo(this.map);
    if (this.startMarker) this.map.removeLayer(this.startMarker);
    this.startMarker = L.circleMarker([this.latlng.lat, this.latlng.lng], {
      radius: 5,
      color: '#00B14F',
    })
      .addTo(this.map)
      .bindTooltip('A · Start', {
        permanent: true,
        direction: 'top',
        offset: [0, -10],
        className: 'start-tooltip',
      })
      .openTooltip();

    // fix map size
    setTimeout(() => {
      this.map.invalidateSize();
    }, 200);

    this.fetchStartAddress(this.latlng.lat, this.latlng.lng);
    // apply pending position
    if (this.pendingLivePos) {
      const pendingPos = this.pendingLivePos;
      this.pendingLivePos = null;
      queueMicrotask(() => this.GeolocationService.movingPosition.set(pendingPos));
    }
  }

  // handle live position updates
  constructor() {
    effect(() => {
      const pos = this.GeolocationService.movingPosition();
      if (!pos) return;
      // buffer if no map
      if (!this.map) {
        this.pendingLivePos = pos;
        return;
      }
      const startLatLng = L.latLng(this.latlng.lat, this.latlng.lng);
      const movingLatLng = L.latLng(pos.lat, pos.lng);
      // create or move marker B
      if (!this.lastMarker) {
        this.lastMarker = L.circleMarker([pos.lat, pos.lng], {
          radius: 5,
          color: 'blue',
        })
          .addTo(this.map)
          .bindTooltip('B · Now', {
            permanent: true,
            direction: 'top',
            offset: [0, -10],
            className: 'moving-tooltip',
          })
          .openTooltip();
      } else {
        this.lastMarker.setLatLng([pos.lat, pos.lng]);
      }
      // update distance
      const distance = startLatLng.distanceTo(movingLatLng); // distance in meters
      this.distanceFromStart.set(distance);
      if (!this.distanceLine) {
        // draw line
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
        // update line
        this.distanceLine.setLatLngs([startLatLng, movingLatLng]);
        const tooltip = this.distanceLine.getTooltip();
        if (tooltip) {
          tooltip.setContent(`${distance.toFixed(2)} m`);
        }
      }
      // follow position
      this.map.panTo([pos.lat, pos.lng]);

      // throttled reverse
      const now = Date.now();
      const moved = this.lastReversePos
        ? L.latLng(this.lastReversePos.lat, this.lastReversePos.lng).distanceTo(movingLatLng)
        : Infinity; // first time always passes
      // check gate
      if (now - this.lastReverseAt > 5000 && moved > 10) {
        this.lastReverseAt = now;
        this.lastReversePos = { lat: pos.lat, lng: pos.lng };
        const id = ++this.liveReverseId; // new request id
        this.liveAbort?.abort(); // cancel old request
        this.liveAbort = new AbortController();
        // fetch live address
        void this.fetchLiveAddress(pos.lat, pos.lng, id, this.liveAbort.signal);
      }
    });
  }

  // show loading
  async showLoading() {
    this.loader = await this.loadingController.create({
      message: 'Please wait',
    });
    await this.loader.present();
  }

  // hide loading
  async hideLoading() {
    if (this.loader) {
      await this.loader.dismiss();
      this.loader = undefined;
    }
  }

  // start map
  async showMap() {
    if (this.loader) return;
    this.isMapVisible = true;
    await this.showLoading();
    await this.loadStartLocation();
  }

  // start tracking
  async startTracking() {
    if (this.watcherId) return;
    this.watcherId = await this.GeolocationService.watchPosition();
    this.trackingIndicator = 'Tracking';
  }

  // stop tracking
  async stopWatching() {
    if (this.watcherId) {
      await this.GeolocationService.clearWatch(this.watcherId);
      this.watcherId = null;
      this.trackingIndicator = 'Stopped';
    }
  }

  // cleanup
  async ngOnDestroy() {
    if (this.watcherId) {
      await this.GeolocationService.clearWatch(this.watcherId);
      this.watcherId = null;
    }
    this.liveAbort?.abort();
  }
}
