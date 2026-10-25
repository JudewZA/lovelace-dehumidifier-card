/* Local-first Dehumidifier Card. No imports, telemetry or remote assets. */
(() => {
  const VERSION = '2.2.1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  const fmt = (value, digits=0) => num(value) === null ? '—' : Number(value).toFixed(digits);
  const icon = name => `<ha-icon icon="mdi:${name}" aria-hidden="true"></ha-icon>`;
  const bad = state => !state || ['unknown','unavailable'].includes(state.state);
  const css = `
    :host{display:block;--dc-accent:var(--info-color,#22b8ef);--dc-line:rgba(255,255,255,.15)}
    *{box-sizing:border-box}ha-card{position:relative;overflow:hidden;color:var(--primary-text-color,#f4f7ff);border-radius:24px;border:1px solid var(--dc-line);background:var(--dehumidifier-card-background,linear-gradient(140deg,rgba(119,139,171,.23),rgba(22,36,62,.28)));box-shadow:0 8px 30px #00000014;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);font-family:inherit}
    .top{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:16px 20px 0;min-height:48px;font-size:13px}.mode{display:flex;align-items:center;gap:6px;min-width:0}.mode span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.badge{font-size:11px;white-space:nowrap;border:1px solid var(--dc-line);padding:4px 8px;border-radius:20px}.hero{position:relative;width:min(100%,320px);height:256px;margin:0 auto}.ring{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.track,.progress{fill:none;stroke-width:3;stroke-linecap:round}.track{stroke:var(--disabled-text-color,#9ca8bb);opacity:.55}.progress{stroke:var(--dc-accent);transition:stroke-dasharray .35s ease}.dot{fill:var(--dc-accent)}
    .appliance{position:absolute;width:100px;height:154px;left:50%;top:50px;transform:translateX(-50%);opacity:.7}.reading{position:absolute;top:106px;left:50%;transform:translateX(-50%);min-width:158px;padding:10px 18px 12px;text-align:center;border:1px solid #ffffff18;border-radius:12px;background:rgba(15,23,42,.83);color:#f5f8ff;box-shadow:0 8px 20px #0002}.value{font-size:46px;letter-spacing:-2px;line-height:1.05;font-weight:650;font-variant-numeric:tabular-nums}.unit{font-size:13px;margin-top:5px;color:#d5dfed}.name{font-size:17px;line-height:1.5;font-weight:650;text-align:center;margin:0 20px;overflow-wrap:anywhere}.state{text-align:center;font-size:13px;min-height:36px;padding:4px 16px 13px;color:var(--secondary-text-color,#c4cfe0)}.state.on{color:var(--dc-accent)}
    .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--dc-line);border-bottom:1px solid var(--dc-line)}.stat{min-width:0;text-align:center;padding:14px 4px;border-inline-end:1px solid var(--dc-line)}.stat:last-child{border:0}.stat-value{font-size:18px;line-height:1.4;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.stat-value small{font-size:11px}.label{font-size:11px;color:var(--secondary-text-color,#c4cfe0);margin-top:4px;line-height:1.5}
    .footer{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:10px 12px}.group{display:flex;gap:8px;align-items:center}button,select{font:inherit;color:inherit;min-height:44px;min-width:44px;border:1px solid transparent;border-radius:12px;background:transparent}button{cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px}select{max-width:148px;padding:8px;background:var(--card-background-color,#25324b);border-color:var(--dc-line);font-size:12px}button:hover:enabled{background:#ffffff12}button:active:enabled{background:#ffffff20}button:focus-visible,select:focus-visible{outline:2px solid var(--dc-accent);outline-offset:2px}button:disabled,select:disabled{cursor:default;opacity:.4}.power{color:var(--dc-accent)}ha-icon{--mdc-icon-size:20px;width:20px;height:20px}.notice{font-size:11px;text-align:center;color:var(--secondary-text-color,#c4cfe0);padding:0 16px 12px;line-height:1.5}.error{color:var(--error-color,#ef7777);padding:12px 16px;line-height:1.5;font-size:13px}.missing{padding:28px 20px}.missing h3{margin-top:0}
    @media(max-width:360px){.top{padding-inline:14px}.hero{height:240px}.appliance{top:44px}.reading{top:100px}.name{font-size:15px}.stat-value{font-size:16px}.footer{flex-wrap:wrap}.label{font-size:10px}select{max-width:130px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
  `;
  // Vector face inspired by the user's photo; no external image or frozen readings.
  const dial = `<svg class="dial" viewBox="0 0 320 320" aria-hidden="true"><defs><linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".25" stop-color="#c6ccd1"/><stop offset=".52" stop-color="#f8fafb"/><stop offset=".76" stop-color="#a9b1b8"/><stop offset="1" stop-color="#f4f7f9"/></linearGradient><radialGradient id="screen"><stop stop-color="#e9edef"/><stop offset="1" stop-color="#cbd2d7"/></radialGradient></defs><circle cx="160" cy="160" r="153" fill="url(#rim)" stroke="#f4f6f8" stroke-width="2"/><circle cx="160" cy="160" r="135" fill="#15191d" stroke="#8a959d" stroke-width="2"/>${Array.from({length:80},(_,i)=>`<path d="M160 27V80" transform="rotate(${i*4.5} 160 160)" stroke="#bcc5cb" stroke-width="1.6"/>`).join('')}<circle cx="160" cy="160" r="82" fill="url(#screen)" stroke="#b7c0c7"/></svg>`;
  const faceCss = `
    :host{--dc-accent:#18c1cc;--dc-line:rgba(187,205,218,.15)}
    ha-card{background:var(--dehumidifier-card-background,linear-gradient(150deg,#2b3543e8,#14202ce8));box-shadow:0 12px 36px #0002;border-radius:26px;color:#edf4f8}
    .top{padding:18px 20px 0;color:#d8e3eb}.badge{color:#9ff5ec;border-color:#18c1cc45;background:#18c1cc0d}
    .hero{width:min(calc(100% - 32px),310px);height:auto;aspect-ratio:1;margin:12px auto 10px;container-type:inline-size;filter:drop-shadow(0 14px 15px #0004)}
    .dial{display:block;width:100%;height:100%}.reading{top:25.5%;left:25.5%;width:49%;height:49%;transform:none;min-width:0;padding:7% 4%;background:transparent;border:0;box-shadow:none;border-radius:50%;color:#243440;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0}
    .value{display:flex;align-items:baseline;justify-content:center;gap:5px;flex-shrink:0;font-size:clamp(30px,17cqw,54px);font-weight:400;letter-spacing:-2px;line-height:1}.value .percent{font-size:clamp(12px,5cqw,16px);letter-spacing:0;color:#435762}.unit{color:#435762;font-size:clamp(10px,4cqw,12px);margin-top:4px}.target-line{flex:0 0 4px;height:4px;width:80%;border-radius:4px;background:#18c1cc;margin:9px auto 9px;box-shadow:0 0 8px #18c1cc35}.dial-target{flex-shrink:0;font-size:clamp(10px,4cqw,12px);color:#435762;line-height:1.3;font-variant-numeric:tabular-nums}
    .target-line.blue{background:#14bce4;box-shadow:0 0 8px #14bce435;animation:humidity-breathe 3.6s ease-in-out infinite}.target-line.green{background:#20ab70;box-shadow:0 0 8px #20ab7035}.target-line.gray{background:#929da6;box-shadow:none}
    @keyframes humidity-breathe{0%,100%{opacity:.35;box-shadow:0 0 3px #14bce420}50%{opacity:1;box-shadow:0 0 12px #14bce470}}@media(prefers-reduced-motion:reduce){.target-line.blue{animation:none;opacity:1}}
    .name{font-size:16px;margin:0 16px}.state{padding-bottom:16px;color:#b4c6d3}.state.on{color:#70e1d9}.label,.notice{color:#b4c6d3}.stats{grid-template-columns:repeat(3,minmax(0,1fr));margin:0 16px;border-radius:16px;background:#ffffff04;overflow:hidden;border:1px solid var(--dc-line)}.stat{padding:12px 4px}.stat-value{font-size:19px}.label{font-size:12px}
    .footer{display:grid;grid-template-columns:1fr 1.2fr;gap:12px;padding:16px 16px 10px}.power{min-height:48px;background:#18c1cc1a;border:1px solid #18c1cc50;color:#9bf6ed;font-size:13px;font-weight:600}.power:hover:enabled{background:#18c1cc30}.target-controls{display:flex;gap:8px;align-items:center;justify-content:space-between;border:1px solid var(--dc-line);border-radius:14px;padding:2px}.target-number{text-align:center;font-size:15px;white-space:nowrap;font-variant-numeric:tabular-nums}.target-number small{display:block;font-size:10px;color:#b4c6d3;line-height:1.4}.target-controls button{background:#ffffff08;flex-shrink:0;min-width:40px}
    .mode-row{padding:0 16px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:#c4d3dd}.mode-row select{max-width:none;flex:1;min-width:0;color:#edf4f8;background:#ffffff08;border-radius:12px;min-height:46px}.mode-row option{background:#243442;color:#edf4f8}.notice{font-size:11px;padding-bottom:14px}.error{color:#ffb9b9}
    @media(max-width:360px){.hero{height:auto}.reading{top:25.5%;padding-top:7%}.footer{grid-template-columns:1fr;gap:8px}.target-controls{justify-content:space-between}.name{font-size:15px}.stat-value{font-size:17px}}
  `;

  class DehumidifierCard extends HTMLElement {
    constructor(){super();this.attachShadow({mode:'open'});this._pending=false;this._error='';}
    setConfig(config){
      if(!config.entity || !/^humidifier\.[a-z0-9_]+$/.test(config.entity)) throw new Error('ระบุ entity ของเครื่องลดความชื้นในโดเมน humidifier');
      const min=num(config.min_humidity), max=num(config.max_humidity), step=num(config.step);
      if((min!==null&&max!==null&&min>=max)||(step!==null&&step<=0)) throw new Error('ช่วงความชื้นหรือ step ไม่ถูกต้อง');
      this._config={...config,read_only:config.read_only!==false};this._fingerprint=null;this._render();
    }
    set hass(hass){this._hass=hass;this._render();}
    getCardSize(){return 6;}
    getGridOptions(){return {columns:12,rows:7,min_columns:6};}
    static getConfigElement(){return document.createElement('dehumidifier-card-editor');}
    static getStubConfig(hass){return {entity:Object.keys(hass?.states||{}).find(x=>x.startsWith('humidifier.'))||'humidifier.example',read_only:true};}
    _data(){
      const c=this._config,h=this._hass,s=h.states[c.entity],a=s?.attributes||{};
      const sensor=id=>bad(h.states[id])?null:h.states[id].state;
      const current=c.humidity_entity?num(sensor(c.humidity_entity)):num(a.current_humidity??a['environment.relative_humidity']);
      const temperature=c.temperature_entity?num(sensor(c.temperature_entity)):num(a.current_temperature??a.temperature??a['environment.temperature']);
      const target=num(a.humidity??a.target_humidity);
      const tank=c.tank_entity?sensor(c.tank_entity):(c.tank_attribute?a[c.tank_attribute]:a.water_tank_full??a['dehumidifier.water_tank_full']);
      const tankText=tank===true||tank==='on'?'เต็ม':tank===false||tank==='off'?'ปกติ':tank===undefined||tank===null||['unknown','unavailable'].includes(tank)?'—':String(tank);
      const modes=Array.isArray(a.available_modes)?a.available_modes:[];
      return {s,a,current,temperature,target,tankText,modes,mode:a.mode||'',min:num(c.min_humidity)??num(a.min_humidity)??40,max:num(c.max_humidity)??num(a.max_humidity)??70,step:num(c.step)??1};
    }
    _render(){
      if(!this._hass||!this._config)return;
      const c=this._config,d=this._data(),{s,a,current,temperature,target,tankText,modes,mode,min,max,step}=d;
      const fingerprint=JSON.stringify([c,s,current,temperature,tankText,this._pending,this._error]);
      if(fingerprint===this._fingerprint)return;this._fingerprint=fingerprint;
      if(!s){this.shadowRoot.innerHTML=`<style>${css}</style><ha-card><div class="missing"><h3>ไม่พบเครื่องลดความชื้น</h3><span>${esc(c.entity)}</span></div></ha-card>`;return;}
      const unavailable=bad(s),on=s.state==='on',disabled=c.read_only||unavailable||this._pending;
      const humidity=unavailable?null:current;
      const lineState=!on||unavailable||humidity===null||target===null?'gray':humidity<=target?'green':'blue';
      const lineLabel=lineState==='green'?'ความชื้นถึงเป้าหมายแล้ว':lineState==='blue'?'ความชื้นสูงกว่าเป้าหมาย':'ปิดเครื่องหรือข้อมูลไม่พร้อมใช้งาน';
      const targetSupported=(Number(a.supported_features)&1)!==0;
      const stateText=unavailable?'ไม่พร้อมใช้งาน':on?'เปิดเครื่องอยู่':'ปิดเครื่องอยู่';
      const translateMode=m=>({'Auto':'อัตโนมัติ','Smart':'อัตโนมัติ','Off':'ปิด','Silent':'เงียบ','Sleep':'นอนหลับ','Clothes Drying':'อบผ้า','Continuous':'ต่อเนื่อง'}[m]||m);
      const modeLabel=translateMode(mode)||'เครื่องลดความชื้น';
      const stat=(v,u,l)=>`<div class="stat"><div class="stat-value">${esc(v)}<small>${esc(u)}</small></div><div class="label">${l}</div></div>`;
      this.shadowRoot.innerHTML=`<style>${css}${faceCss}</style><ha-card>
        <div class="top"><div class="mode">${icon('fan')}<span>${esc(modeLabel)}</span></div><span class="badge">${c.read_only?'อ่านอย่างเดียว':this._pending?'กำลังส่งคำสั่ง':'XIAOMI'}</span></div>
        <div class="hero" role="img" aria-label="ความชื้นปัจจุบัน ${humidity===null?'ไม่พร้อมใช้งาน':esc(humidity)+' เปอร์เซ็นต์'} · ${lineLabel}">${dial}<div class="reading"><div class="value">${fmt(humidity)}<span class="percent">%</span></div><div class="target-line ${lineState}" title="${lineLabel}"></div><div class="dial-target">เป้าหมาย ${fmt(unavailable?null:target)}%</div></div></div>
        <h3 class="name">${esc(c.name||a.friendly_name||'Xiaomi Smart Dehumidifier')}</h3><div class="state ${on&&!unavailable?'on':''}">${stateText}</div>
        <div class="stats">${stat(fmt(unavailable?null:temperature,1),temperature===null?'':' °C','อุณหภูมิ')}${stat(fmt(humidity),humidity===null?'':' %','ความชื้นห้อง')}${stat(unavailable?'—':tankText,'','ถังน้ำ')}</div>
        <div class="footer"><button id="power" class="power" aria-label="${on?'ปิด':'เปิด'}เครื่องลดความชื้น" title="${c.read_only?'ปุ่มควบคุมปิดใช้งานในโหมดอ่านอย่างเดียว':on?'ปิดเครื่อง':'เปิดเครื่อง'}" ${disabled?'disabled':''}>${icon('power')} ${on?'ปิดเครื่อง':'เปิดเครื่อง'}</button><div class="target-controls"><button id="minus" aria-label="ลดความชื้นเป้าหมาย" ${disabled||!targetSupported||target===null||target<=min?'disabled':''}>${icon('minus')}</button><span class="target-number">${fmt(unavailable?null:target)}%<small>เป้าหมาย</small></span><button id="plus" aria-label="เพิ่มความชื้นเป้าหมาย" ${disabled||!targetSupported||target===null||target>=max?'disabled':''}>${icon('plus')}</button></div></div>
        ${modes.length?`<label class="mode-row"><span>โหมด</span><select id="mode" aria-label="โหมดการทำงาน" ${disabled?'disabled':''}>${modes.includes(mode)?'':'<option value="">เลือกโหมด</option>'}${modes.map(m=>`<option value="${esc(m)}" ${m===mode?'selected':''}>${esc(translateMode(m))}</option>`).join('')}</select></label>`:''}
        ${this._error?`<div class="error" role="alert">${esc(this._error)}</div>`:''}
      </ha-card>`;
      this._translateView();
      this.shadowRoot.getElementById('power').onclick=()=>this._command(on?'turn_off':'turn_on');
      this.shadowRoot.getElementById('minus').onclick=()=>this._adjust(-1);
      this.shadowRoot.getElementById('plus').onclick=()=>this._adjust(1);
      const select=this.shadowRoot.getElementById('mode');if(select)select.onchange=e=>this._command('set_mode',{mode:e.target.value});
    }
    _adjust(direction){const d=this._data();if(d.target===null)return;this._command('set_humidity',{humidity:Math.max(d.min,Math.min(d.max,d.target+direction*d.step))});}
    _translateView(){
      if((this._config.language||this._hass.language||'en').startsWith('th'))return;
      const phrases=[['ความชื้นสูงกว่าเป้าหมาย','Humidity above target'],['ความชื้นถึงเป้าหมายแล้ว','Target humidity reached'],['ปิดเครื่องหรือข้อมูลไม่พร้อมใช้งาน','Off or unavailable'],['ปุ่มควบคุมปิดใช้งานในโหมดอ่านอย่างเดียว','Controls disabled in read-only mode'],['ลดความชื้นเป้าหมาย','Decrease target humidity'],['เพิ่มความชื้นเป้าหมาย','Increase target humidity'],['ปิดเครื่องลดความชื้น','Turn off dehumidifier'],['เปิดเครื่องลดความชื้น','Turn on dehumidifier'],['ความชื้นปัจจุบัน','Current humidity'],['เปิดเครื่องอยู่','Powered on'],['ปิดเครื่องอยู่','Powered off'],['กำลังส่งคำสั่ง','Sending command'],['ไม่พร้อมใช้งาน','Unavailable'],['ส่งคำสั่งไม่สำเร็จ','Command failed'],['ความชื้นห้อง','Humidity'],['อ่านอย่างเดียว','Read only'],['เครื่องลดความชื้น','Dehumidifier'],['อุณหภูมิ','Temperature'],['เป้าหมาย','Target'],['ปิดเครื่อง','Turn off'],['เปิดเครื่อง','Turn on'],['อัตโนมัติ','Auto'],['นอนหลับ','Sleep'],['อบผ้า','Dry clothes'],['ต่อเนื่อง','Continuous'],['เงียบ','Silent'],['เลือกโหมด','Select mode'],['โหมด','Mode'],['ถังน้ำ','Tank'],['เปอร์เซ็นต์','percent'],['เต็ม','Full'],['ปกติ','OK']];
      const translate=text=>phrases.reduce((s,[th,en])=>s.split(th).join(en),text);
      const card=this.shadowRoot.querySelector('ha-card');
      const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);let node;
      while((node=walker.nextNode())){if(!node.parentElement.closest('.name'))node.textContent=translate(node.textContent);}
      card.querySelectorAll('[aria-label],[title]').forEach(el=>{for(const attr of ['aria-label','title'])if(el.hasAttribute(attr))el.setAttribute(attr,translate(el.getAttribute(attr)));});
    }
    async _command(service,payload={}){
      if(!this._hass||!this._config||this._config.read_only||this._pending)return;
      const d=this._data();if(bad(d.s))return;
      if(service==='set_mode'&&!d.modes.includes(payload.mode))return;
      if(service==='set_humidity'&&(!(Number(d.a.supported_features)&1)||num(payload.humidity)===null||payload.humidity<d.min||payload.humidity>d.max))return;
      if(!['turn_on','turn_off','set_mode','set_humidity'].includes(service))return;
      this._pending=true;this._error='';this._render();
      try{await this._hass.callService('humidifier',service,{entity_id:this._config.entity,...payload});}
      catch(error){this._error=`ส่งคำสั่งไม่สำเร็จ: ${error?.message||error}`;}
      finally{this._pending=false;this._render();}
    }
  }
  class DehumidifierCardEditor extends HTMLElement {
    constructor(){super();this.attachShadow({mode:'open'});}
    setConfig(config){this._config={read_only:true,...config};this._render();}
    set hass(hass){this._hass=hass;if(this._form)this._form.hass=hass;else this._render();}
    _render(){
      if(!this._config||!this._hass)return;
      if(!this._form){this.shadowRoot.innerHTML='<div style="padding:12px"><ha-form></ha-form><p style="font-size:13px">โหมดอ่านอย่างเดียวเปิดไว้เป็นค่าเริ่มต้น ปุ่มจะไม่ส่งคำสั่งไปยังอุปกรณ์</p></div>';this._form=this.shadowRoot.querySelector('ha-form');this._form.computeLabel=s=>({entity:'เครื่องลดความชื้น',name:'ชื่อการ์ด',humidity_entity:'เซ็นเซอร์ความชื้น',temperature_entity:'เซ็นเซอร์อุณหภูมิ',tank_entity:'เซ็นเซอร์ถังน้ำ (ถ้ามี)',tank_attribute:'แอตทริบิวต์ถังน้ำ (ถ้ามี)',read_only:'อ่านอย่างเดียว · ปิดปุ่มควบคุม',min_humidity:'ความชื้นเป้าหมายต่ำสุด',max_humidity:'ความชื้นเป้าหมายสูงสุด',step:'ขั้นการปรับความชื้น'}[s.name]||s.name);this._form.addEventListener('value-changed',e=>{e.stopPropagation();this._config={...this._config,...e.detail.value};this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));});}
      this._form.hass=this._hass;this._form.data=this._config;this._form.schema=[{name:'entity',required:true,selector:{entity:{domain:'humidifier'}}},{name:'name',selector:{text:{}}},{name:'humidity_entity',selector:{entity:{domain:'sensor',device_class:'humidity'}}},{name:'temperature_entity',selector:{entity:{domain:'sensor',device_class:'temperature'}}},{name:'tank_entity',selector:{entity:{}}},{name:'tank_attribute',selector:{text:{}}},{name:'read_only',selector:{boolean:{}}},{name:'min_humidity',selector:{number:{min:0,max:100,mode:'box'}}},{name:'max_humidity',selector:{number:{min:0,max:100,mode:'box'}}},{name:'step',selector:{number:{min:1,max:20,mode:'box'}}}];
    }
  }
  if(!customElements.get('dehumidifier-card'))customElements.define('dehumidifier-card',DehumidifierCard);
  if(!customElements.get('dehumidifier-card-editor'))customElements.define('dehumidifier-card-editor',DehumidifierCardEditor);
  window.customCards=window.customCards||[];if(!window.customCards.some(c=>c.type==='dehumidifier-card'))window.customCards.push({type:'dehumidifier-card',name:'Dehumidifier Card',description:'Glass humidity gauge · local only · read-only by default',preview:true});
  console.info(`Dehumidifier Card ${VERSION}`);
})();
