console.info(
  "%c DEHUMIDIFIER-CARD %c 1.0.0 ",
  "color: white; background: green; font-weight: 700;",
  "color: green; background: white; font-weight: 700;"
);

class DehumidifierCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) {
      throw new Error("Entity is required");
    }
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 3;
  }

  render() {
    if (!this.config || !this._hass) return;

    const entity = this._hass.states[this.config.entity];
    if (!entity) {
      this.innerHTML = `<ha-card><div class="not-found">Entity not found</div></ha-card>`;
      return;
    }

    const attributes = entity.attributes;

    const currentHumidity = this._hass.states["sensor.dmaker_22ht_067c_relative_humidity"]?.state ?? "--";
    const currentTemp = this._hass.states["sensor.dmaker_22ht_067c_temperature"]?.state ?? "--";
    const targetHumidity = attributes.humidity ?? "--";
    const mode = attributes.mode ?? "--";
    const isOn = entity.state !== "off";

     this.innerHTML = `
      <ha-card header="${this.config.name || 'Dehumidifier'}">
        <div class="card-content" style="text-align:center;">
          <div style="font-size:48px;font-weight:bold;">${currentHumidity}%</div>
          <div style="font-size:14px;color:var(--secondary-text-color);">Current Humidity</div>
          <br/>
          <div>Target: ${targetHumidity}%</div>
          <div>Temperature: ${currentTemp}°C</div>
          <div>Mode: ${mode}</div>
          <br/>
          <mwc-button @click="${() => this.togglePower(entity.entity_id, isOn)}">
            ${isOn ? "Turn Off" : "Turn On"}
          </mwc-button>
          <br/><br/>
          <ha-slider
            min="30"
            max="80"
            step="1"
            value="${targetHumidity}"
            @change="${(e) => this.setHumidity(entity.entity_id, e.target.value)}"
          ></ha-slider>
        </div>
        <div class="toolbar" style="display:flex;justify-content:space-around;padding:10px;border-top:1px solid var(--divider-color);">
          ${this.renderToolbarButton("switch.dmaker_22ht_067c_physical_control_locked", "mdi:lock")}
          ${this.renderToolbarButton("switch.dmaker_22ht_067c_alarm", "mdi:volume-high")}
          ${this.renderToolbarButton("light.dmaker_22ht_067c_indicator_light", "mdi:lightbulb")}
          ${this.renderToolbarButton("button.dmaker_22ht_067c_info", "mdi:information")}
        </div>
      </ha-card>
    `;
  }

  renderToolbarButton(entity_id, icon) {
    const st = this._hass.states[entity_id];
    const isOn = st?.state === "on";
    return `
      <ha-icon-button
        icon="${icon}"
        style="color:${isOn ? "var(--primary-color)" : "var(--secondary-text-color)"}"
        @click="${() => this.toggleEntity(entity_id, isOn)}"
      ></ha-icon-button>
    `;
  }

  togglePower(entity_id, isOn) {
    this._hass.callService("humidifier", isOn ? "turn_off" : "turn_on", {
      entity_id,
    });
  }

  setHumidity(entity_id, humidity) {
    this._hass.callService("humidifier", "set_humidity", {
      entity_id,
      humidity: Number(humidity),
    });
  }

  toggleEntity(entity_id, isOn) {
    const [domain] = entity_id.split(".");
    if (domain === "button") {
      this._hass.callService(domain, "press", { entity_id });
    } else {
      this._hass.callService(domain, isOn ? "turn_off" : "turn_on", { entity_id });
    }
  }
}

customElements.define("dehumidifier-card", DehumidifierCard);
