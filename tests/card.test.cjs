const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function setup({readOnly=true,state='on',current=58,target=50}={}) {
  const registry=new Map(),calls=[];
  class Element { attachShadow(){this.shadowRoot={innerHTML:'',getElementById:()=>({})};} }
  const context={HTMLElement:Element,window:{},console:{info(){}},customElements:{get:n=>registry.get(n),define:(n,v)=>registry.set(n,v)}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/dehumidifier-card.js'),'utf8'),context);
  const card=new (registry.get('dehumidifier-card'))();
  const entity={state,attributes:{friendly_name:'Example',humidity:target,current_humidity:current,min_humidity:40,max_humidity:70,supported_features:1,mode:'Smart',available_modes:['Smart','Sleep']}};
  const hass={language:'th',states:{'humidifier.example':entity},callService:async(...args)=>calls.push(args)};
  card.setConfig({entity:'humidifier.example',read_only:readOnly});card.hass=hass;
  return {card,hass,entity,calls};
}

test('render and state updates never call a service',()=>{
  const {card,hass,calls}=setup({readOnly:false});card.hass=hass;assert.equal(calls.length,0);
});
test('blue breathes only when on and above target',()=>{
  const {card}=setup();assert.match(card.shadowRoot.innerHTML,/target-line blue/);assert.match(card.shadowRoot.innerHTML,/humidity-breathe 3.6s/);assert.match(card.shadowRoot.innerHTML,/prefers-reduced-motion:reduce/);
});
test('target reached is green, but off always takes precedence',()=>{
  assert.match(setup({current:50,target:50}).card.shadowRoot.innerHTML,/target-line green/);
  assert.match(setup({current:45,target:50}).card.shadowRoot.innerHTML,/target-line green/);
  assert.match(setup({state:'off',current:45,target:50}).card.shadowRoot.innerHTML,/target-line gray/);
});
test('missing current is not replaced by target',()=>{
  const {card}=setup({current:null});assert.equal(card._data().current,null);assert.match(card.shadowRoot.innerHTML,/target-line gray/);
});
test('unavailable devices block all commands',async()=>{
  const {card,calls}=setup({readOnly:false,state:'unavailable'});await card._command('turn_on');assert.equal(calls.length,0);assert.match(card.shadowRoot.innerHTML,/target-line gray/);
});
test('read-only blocks even direct invocation of a command',async()=>{
  const {card,calls}=setup();await card._command('turn_off');await card._command('set_humidity',{humidity:45});assert.equal(calls.length,0);
});
test('enabled humidity control clamps to the device bounds',async()=>{
  const {card,calls}=setup({readOnly:false,target:40});card._adjust(-1);assert.equal(calls.length,1);assert.equal(calls[0][0],'humidifier');assert.equal(calls[0][1],'set_humidity');assert.equal(calls[0][2].humidity,40);
});
test('invalid modes, unsupported humidity and unknown services are rejected',async()=>{
  const {card,entity,calls}=setup({readOnly:false});await card._command('set_mode',{mode:'invalid'});await card._command('set_humidity',{humidity:999});await card._command('delete');entity.attributes.supported_features=0;await card._command('set_humidity',{humidity:50});assert.equal(calls.length,0);
});
test('command rejection produces an error and clears pending state',async()=>{
  const {card,hass}=setup({readOnly:false});hass.callService=async()=>{throw new Error('Example offline');};await card._command('turn_off');assert.equal(card._pending,false);assert.match(card.shadowRoot.innerHTML,/Example offline/);
});
