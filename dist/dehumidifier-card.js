// ===== MAIN CARD =====
class DehumidifierCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("ต้องระบุ entity (humidifier) ก่อน");
    }
    this._config = {
      name: config.name,
      min_humidity: config.min_humidity ?? 40,
      max_humidity: config.max_humidity ?? 70,
      step: config.step ?? 5,
      show_name: config.show_name ?? true,
      show_state: config.show_state ?? true,
      show_temperature: config.show_temperature ?? true,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 3;
  }

  _render() {
    if (!this._hass || !this._config) return;

    const entityId = this._config.entity;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="missing-entity">
            Entity <code>${entityId}</code> not found
          </div>
        </ha-card>
      `;
      return;
    }

    const state = stateObj.state;
    const isOn = state === "on";
    const attrs = stateObj.attributes || {};

    const targetHumidity = attrs.humidity ?? attrs.target_humidity ?? 50;
    const currentHumidity =
      attrs.current_humidity ?? attrs.humidity ?? attrs.humidity_state ?? "-";
    const temperature = attrs.temperature ?? attrs.current_temperature;
    const mode = attrs.mode ?? attrs.preset_mode ?? attrs.operation_mode ?? "";
    const friendlyName =
      this._config.name ||
      stateObj.attributes.friendly_name ||
      entityId;

    const minHum = this._config.min_humidity;
    const maxHum = this._config.max_humidity;
    const step = this._config.step;

    const numericCurrent =
      typeof currentHumidity === "number"
        ? currentHumidity
        : parseFloat(currentHumidity);
    const percent =
      !isNaN(numericCurrent)
        ? ((numericCurrent - minHum) / (maxHum - minHum)) * 100
        : 0;

    // water tank / status (เดา attribute ทั่วไป)
    const tankAttrName =
      this._config.tank_attribute ||
      "water_tank" ||
      "tank_level" ||
      "water_tank_full";
    const tankAttr = attrs[this._config.tank_attribute] ?? attrs.water_tank ?? attrs.tank_level ?? attrs.water_tank_full;
    let tankText = "";
    if (typeof tankAttr === "boolean") {
      tankText = tankAttr ? "Full" : "OK";
    } else if (typeof tankAttr === "number") {
      tankText = `${tankAttr}%`;
    } else if (typeof tankAttr === "string") {
      tankText = tankAttr;
    }

    const localizedState =
      this._hass.localize(`component.humidifier.state._.${state}`) || state;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          padding: 16px;
          box-sizing: border-box;
          background: var(--ha-card-background, rgba(0,0,0,0.4));
          backdrop-filter: blur(10px);
        }

        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .title {
          font-size: 18px;
          font-weight: 600;
        }
        .state {
          font-size: 13px;
          opacity: 0.8;
          text-transform: uppercase;
        }
        .state.on {
          color: var(--accent-color, #03a9f4);
        }
        .state.off {
          color: var(--secondary-text-color);
        }

        .mode-badge {
          padding: 2px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          font-size: 11px;
          text-transform: capitalize;
        }

        .main {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
          gap: 14px;
          align-items: center;
        }

        /* ฝั่งซ้าย: รูปการทำงานเครื่อง */
        .device-area {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .device-shell {
          width: 80px;
          height: 140px;
          border-radius: 18px;
          background: linear-gradient(145deg, rgba(255,255,255,0.18), rgba(0,0,0,0.1));
          position: relative;
          box-shadow: 0 6px 14px rgba(0,0,0,0.25);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 6px 8px;
        }

        .device-top {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 58px;
          height: 8px;
          border-radius: 999px;
          background: rgba(0,0,0,0.4);
          overflow: hidden;
        }

        .air-flow {
          position: absolute;
          top: -10px;
          left: 50%;
          width: 40px;
          height: 30px;
          transform: translateX(-50%);
          display: flex;
          justify-content: center;
          gap: 4px;
          pointer-events: none;
        }

        .air-line {
          width: 4px;
          border-radius: 999px;
          background: linear-gradient(to top, rgba(3,169,244,0), rgba(3,169,244,0.7));
          opacity: ${isOn ? 1 : 0};
          animation: airMove 1.4s infinite;
        }
        .air-line:nth-child(2) { animation-delay: 0.15s; }
        .air-line:nth-child(3) { animation-delay: 0.3s; }

        @keyframes airMove {
          0% { transform: translateY(18px); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateY(-4px); opacity: 0; }
        }

        .water-level {
          width: 100%;
          height: 60%;
          border-radius: 14px;
          background: linear-gradient(to top, rgba(3,169,244,0.55), rgba(3,169,244,0.1));
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .water-fill {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 120%;
          background: linear-gradient(180deg, rgba(3,169,244,0.9), rgba(3,169,244,0.6));
          transform: translateX(-10%);
          height: ${Math.min(Math.max(percent, 0), 100)}%;
          animation: ${isOn ? "wave 3s ease-in-out infinite" : "none"};
        }

        @keyframes wave {
          0% { transform: translate(-10%, 0); }
          50% { transform: translate(-5%, 3%); }
          100% { transform: translate(-10%, 0); }
        }

        .device-indicators {
          position: relative;
          z-index: 1;
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #fff;
          margin-bottom: 4px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${isOn ? "var(--accent-color, #03a9f4)" : "rgba(255,255,255,0.3)"};
          box-shadow: ${isOn ? "0 0 6px rgba(3,169,244,0.9)" : "none"};
        }

        .device-label {
          font-size: 10px;
          opacity: 0.85;
        }

        .device-right {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .big-value {
          font-size: 32px;
          font-weight: 600;
          line-height: 1;
        }
        .big-label {
          font-size: 12px;
          opacity: 0.8;
        }
        .target-text {
          font-size: 12px;
          opacity: 0.85;
        }

        /* ฝั่งขวา: ข้อมูล + slider */
        .right-panel {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }
        .label {
          opacity: 0.8;
        }
        .value {
          font-weight: 500;
          text-align: right;
        }

        .tag {
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          font-size: 11px;
        }

        .slider-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        input[type="range"] {
          width: 100%;
        }

        .toolbar {
          margin-top: 6px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        button {
          border: none;
          border-radius: 16px;
          padding: 6px 12px;
          font-size: 13px;
          cursor: pointer;
          background: rgba(255,255,255,0.08);
          color: inherit;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        button.primary {
          background: var(--accent-color, #03a9f4);
          color: #fff;
        }

        button:active {
          transform: scale(0.97);
        }

        .missing-entity {
          padding: 12px;
          color: var(--error-color, #f44336);
        }

        @media (max-width: 600px) {
          .main {
            grid-template-columns: 1fr;
          }
          .device-shell {
            width: 70px;
            height: 120px;
          }
          .big-value {
            font-size: 26px;
          }
        }
      </style>

      <ha-card>
        <div class="wrapper">
          <div class="header">
            <div class="title-block">
              ${
                this._config.show_name
                  ? `<div class="title">${friendlyName}</div>`
                  : ""
              }
              ${
                this._config.show_state
                  ? `<div class="state ${isOn ? "on" : "off"}">
                      ${localizedState}
                    </div>`
                  : ""
              }
            </div>
            ${
              mode
                ? `<div class="mode-badge">${mode}</div>`
                : ""
            }
          </div>

          <div class="main">
            <!-- รูปการทำงาน -->
            <div class="device-area">
              <div class="device-shell">
                <div class="air-flow">
                  <div class="air-line"></div>
                  <div class="air-line"></div>
                  <div class="air-line"></div>
                </div>
                <div class="device-top"></div>
                <div class="device-indicators">
                  <div class="dot"></div>
                  <div class="device-label">${isOn ? "RUN" : "STANDBY"}</div>
                </div>
                <div class="water-level">
                  <div class="water-fill"></div>
                </div>
              </div>

              <div class="device-right">
                <div>
                  <div class="big-value">
                    ${
                      currentHumidity !== "-"
                        ? `${currentHumidity}%`
                        : "--"
                    }
                  </div>
                  <div class="big-label">Current humidity</div>
                </div>
                <div class="target-text">
                  Target: ${targetHumidity}%  
                </div>
                ${
                  this._config.show_temperature && temperature !== undefined
                    ? `<div class="target-text">
                        Temperature: ${temperature}°C
                      </div>`
                    : ""
                }
              </div>
            </div>

            <!-- ข้อมูล + slider -->
            <div class="right-panel">
              <div class="row">
                <div class="label">Power</div>
                <div class="value">${isOn ? "On" : "Off"}</div>
              </div>

              <div class="row">
                <div class="label">Humidity range</div>
                <div class="value">${minHum}% – ${maxHum}%</div>
              </div>

              ${
                tankText
                  ? `<div class="row">
                      <div class="label">Tank</div>
                      <div class="value">
                        <span class="tag">${tankText}</span>
                      </div>
                    </div>`
                  : ""
              }

              <div class="slider-row">
                <div class="row">
                  <div class="label">Target humidity</div>
                  <div class="value">${targetHumidity}%</div>
                </div>
                <input
                  type="range"
                  min="${minHum}"
                  max="${maxHum}"
                  step="${step}"
                  value="${targetHumidity}"
                  id="humidity-slider"
                />
              </div>
            </div>
          </div>

          <div class="toolbar">
            <button id="minus-btn">- ${step}%</button>
            <button id="plus-btn">+ ${step}%</button>
            <button id="toggle-btn" class="primary">
              ${isOn ? "Turn off" : "Turn on"}
            </button>
          </div>
        </div>
      </ha-card>
    `;

    this._attachEventListeners();
  }

  _attachEventListeners() {
    const slider = this.shadowRoot.getElementById("humidity-slider");
    const minusBtn = this.shadowRoot.getElementById("minus-btn");
    const plusBtn = this.shadowRoot.getElementById("plus-btn");
    const toggleBtn = this.shadowRoot.getElementById("toggle-btn");

    if (slider) {
      slider.onchange = (e) => {
        const value = parseInt(e.target.value, 10);
        this._setHumidity(value);
      };
    }

    if (minusBtn) {
      minusBtn.onclick = () => {
        const stateObj = this._hass.states[this._config.entity];
        const attrs = stateObj.attributes || {};
        const current = attrs.humidity ?? attrs.target_humidity ?? 50;
        const newValue = Math.max(
          this._config.min_humidity,
          current - this._config.step
        );
        this._setHumidity(newValue);
      };
    }

    if (plusBtn) {
      plusBtn.onclick = () => {
        const stateObj = this._hass.states[this._config.entity];
        const attrs = stateObj.attributes || {};
        const current = attrs.humidity ?? attrs.target_humidity ?? 50;
        const newValue = Math.min(
          this._config.max_humidity,
          current + this._config.step
        );
        this._setHumidity(newValue);
      };
    }

    if (toggleBtn) {
      toggleBtn.onclick = () => {
        const stateObj = this._hass.states[this._config.entity];
        const isOn = stateObj.state === "on";
        this._hass.callService("humidifier", isOn ? "turn_off" : "turn_on", {
          entity_id: this._config.entity,
        });
      };
    }
  }

  _setHumidity(value) {
    this._hass.callService("humidifier", "set_humidity", {
      entity_id: this._config.entity,
      humidity: value,
    });
  }

  // ให้ Lovelace เรียก editor ได้
  static async getConfigElement() {
    return document.createElement("dehumidifier-card-editor");
  }

  static getStubConfig(hass) {
    const firstHum = Object.keys(hass.states).find(
      (e) => e.startsWith("humidifier.")
    );
    return {
      entity: firstHum || "humidifier.example",
      min_humidity: 40,
      max_humidity: 70,
      step: 5,
    };
  }
}

// ป้องกัน define ซ้ำเวลา reload
if (!customElements.get("dehumidifier-card")) {
  customElements.define("dehumidifier-card", DehumidifierCard);
}

// ลงทะเบียนให้ขึ้นใน Card picker
if (!window.customCards) {
  window.customCards = [];
}
window.customCards.push({
  type: "dehumidifier-card",
  name: "Dehumidifier Card",
  description: "Nice card for Xiaomi / other dehumidifiers",
});

// ===== CONFIG EDITOR =====
class DehumidifierCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = {
      min_humidity: 40,
      max_humidity: 70,
      step: 5,
      show_name: true,
      show_state: true,
      show_temperature: true,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot) {
      this._render();
    }
  }

  _render() {
    if (!this.shadowRoot) return;

    const entity = this._config.entity || "";
    const name = this._config.name || "";
    const minHum = this._config.min_humidity ?? 40;
    const maxHum = this._config.max_humidity ?? 70;
    const step = this._config.step ?? 5;

    const showName = this._config.show_name;
    const showState = this._config.show_state;
    const showTemperature = this._config.show_temperature;
    const tankAttr = this._config.tank_attribute || "";

    this.shadowRoot.innerHTML = `
      <style>
        .form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 0 4px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        label {
          font-size: 13px;
          font-weight: 500;
        }
        input[type="text"],
        input[type="number"] {
          padding: 6px 8px;
          border-radius: 4px;
          border: 1px solid var(--divider-color, #80808055);
          background: transparent;
          color: inherit;
        }
        input[type="checkbox"] {
          margin-right: 6px;
        }
        .description {
          font-size: 11px;
          opacity: 0.7;
        }
        .row-inline {
          display: flex;
          gap: 8px;
        }
        .row-inline .field {
          flex: 1;
        }
      </style>
      <div class="form">
        <div class="field">
          <label>Entity (humidifier)</label>
          <input
            type="text"
            value="${entity}"
            data-config-key="entity"
            placeholder="humidifier.dmaker_22ht_067c_dehumidifier"
          />
          <div class="description">
            เลือก entity ของ Xiaomi Smart Dehumidifier หรือ dehumidifier อื่น
          </div>
        </div>

        <div class="field">
          <label>Name (optional)</label>
          <input
            type="text"
            value="${name}"
            data-config-key="name"
            placeholder="Xiaomi Dehumidifier"
          />
        </div>

        <div class="row-inline">
          <div class="field">
            <label>Min humidity</label>
            <input
              type="number"
              value="${minHum}"
              data-config-key="min_humidity"
            />
          </div>
          <div class="field">
            <label>Max humidity</label>
            <input
              type="number"
              value="${maxHum}"
              data-config-key="max_humidity"
            />
          </div>
          <div class="field">
            <label>Step</label>
            <input
              type="number"
              value="${step}"
              data-config-key="step"
            />
          </div>
        </div>

        <div class="field">
          <label>Tank attribute (optional)</label>
          <input
            type="text"
            value="${tankAttr}"
            data-config-key="tank_attribute"
            placeholder="เช่น water_tank, tank_level"
          />
          <div class="description">
            ถ้า dehumidifier มี attribute บอกสถานะถังน้ำ ให้ใส่ชื่อ attribute ตรงนี้
          </div>
        </div>

        <div class="field">
          <label>
            <input
              type="checkbox"
              ${showName ? "checked" : ""}
              data-config-key="show_name"
            />
            Show name
          </label>
        </div>

        <div class="field">
          <label>
            <input
              type="checkbox"
              ${showState ? "checked" : ""}
              data-config-key="show_state"
            />
            Show state text
          </label>
        </div>

        <div class="field">
          <label>
            <input
              type="checkbox"
              ${showTemperature ? "checked" : ""}
              data-config-key="show_temperature"
            />
            Show temperature (if available)
          </label>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const inputs = this.shadowRoot.querySelectorAll("input");

    inputs.forEach((input) => {
      const key = input.dataset.configKey;
      if (!key) return;

      if (input.type === "checkbox") {
        input.addEventListener("change", (e) => {
          this._config = {
            ...this._config,
            [key]: e.target.checked,
          };
          this._fireConfigChanged();
        });
      } else {
        input.addEventListener("change", (e) => {
          let value = e.target.value;
          if (input.type === "number") {
            value = Number(value);
            if (Number.isNaN(value)) return;
          }
          this._config = {
            ...this._config,
            [key]: value,
          };
          this._fireConfigChanged();
        });
      }
    });
  }

  _fireConfigChanged() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

if (!customElements.get("dehumidifier-card-editor")) {
  customElements.define("dehumidifier-card-editor", DehumidifierCardEditor);
}
