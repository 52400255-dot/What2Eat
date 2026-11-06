import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/js/restaurant-map.js', import.meta.url), 'utf8');
function harness({secure = true, geolocation = true, href = 'http://what2eat.localhost/pages/discovery.php', permission = 'prompt', snapshot = {snapshot_date:'2026-10-15',elements:[]}, apiError = false} = {}) {
  const nodes = new Map(), events = {}, mapEvents = {}, timers = new Map(), requests = [], layers = [], dispatched = [];
  let ready, success, failure, options, nextTimer = 0, redirect;
  function node() { return {textContent:'', disabled:false, hidden:false, attrs:{}, events:{}, append(){}, appendChild(){}, setAttribute(k,v){this.attrs[k]=v;}, removeAttribute(k){delete this.attrs[k];}, addEventListener(k,v){this.events[k]=v;}}; }
  ['map-container','mapStatus','locateMapBtn','refreshMapBtn','pickMapLocationBtn','locationStatus'].forEach(id=>nodes.set(id,node()));
  const map = {center:[10.7769,106.7009],setView(c){this.center=c;return this;},getCenter(){return {lat:this.center[0],lng:this.center[1]};},on(k,v){mapEvents[k]=v;},removeLayer(){}};
  function layer(coords, opts) { const value={coords,opts,addTo(){layers.push(this);return this;},bindPopup(){return this;},openPopup(){return this;},on(){return this;},clearLayers(){}}; return value; }
  const L = {map:()=>map,layerGroup:()=>layer(),tileLayer:()=>layer(),circleMarker:layer,circle:layer,marker:layer};
  const window = {L,isSecureContext:secure,addEventListener(k,v){events[k]=v;},dispatchEvent(e){dispatched.push(e);events[e.type]?.(e);},setTimeout(fn,ms){timers.set(++nextTimer,{fn,ms});return nextTimer;},clearTimeout(id){timers.delete(id);}};
  let watchId = 0;
  const navigator = geolocation ? {geolocation:{watchPosition(s,f,o){success=s;failure=f;options=o;return ++watchId;},clearWatch(){}},permissions:{query:async()=>({state:permission})}} : {};
  const url = new URL(href);
  vm.runInNewContext(source,{window,L,navigator,document:{getElementById:id=>nodes.get(id),createElement:node,createTextNode:()=>node(),addEventListener(k,v){ready=v;}},location:{search:url.search,href,hostname:url.hostname,replace(value){redirect=value;}},URL,URLSearchParams,AbortController,console:{warn(){},error(){}},CustomEvent:class{constructor(type,init){this.type=type;Object.assign(this,init);}},fetch:async(url)=>{requests.push(url);if(url.startsWith('/assets/data/'))return {ok:true,json:async()=>snapshot};if(apiError)return {ok:false,status:500,json:async()=>({error:'Dịch vụ gặp lỗi.'})};return {ok:true,json:async()=>({elements:[]})};}});
  ready();
  return {nodes,map,mapEvents,requests,layers,timers,dispatched,click:id=>nodes.get(id).events.click(),position:(accuracy,lat=10.85,lon=106.8)=>success({coords:{latitude:lat,longitude:lon,accuracy},timestamp:Date.now()}),error:code=>failure({code}),get options(){return options;},get redirect(){return redirect;}};
}
const flush = async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
{
  const h=harness({secure:false,href:'http://what2eat.local/pages/discovery.php?q=pho'});
  assert.equal(h.redirect,'http://what2eat.localhost/pages/discovery.php?q=pho');
  assert.equal(h.requests.length,0);
}
{
  const h=harness();await flush();h.click('locateMapBtn');assert.equal(h.options.enableHighAccuracy,true);assert.equal(h.options.maximumAge,0);
  h.position(25);await flush();assert.equal(h.map.center[0],10.85);assert.match(h.requests.at(-1),/lat=10.85&lon=106.8/);assert.equal(h.nodes.get('locateMapBtn').disabled,false);assert(h.layers.some(l=>l.opts?.radius===25));
  h.map.center=[11,107];h.click('refreshMapBtn');await flush();assert.match(h.requests.at(-1),/lat=11&lon=107/);
}
{
  const h=harness();await flush();h.click('locateMapBtn');h.position(7000);assert.match(h.nodes.get('locationStatus').textContent,/sai số/);assert.equal(h.map.center[0],10.85);
  h.click('pickMapLocationBtn');h.mapEvents.click({latlng:{lat:10.95,lng:106.75}});await flush();assert.match(h.requests.at(-1),/lat=10.95&lon=106.75/);assert.match(h.nodes.get('locationStatus').textContent,/bạn chọn/);
}
{
  const h=harness();await flush();h.click('locateMapBtn');h.error(1);assert.match(h.nodes.get('locationStatus').textContent,/đang bị từ chối/);assert.equal(h.nodes.get('locateMapBtn').disabled,false);
}
{
  const h=harness({geolocation:false});h.click('locateMapBtn');assert.match(h.nodes.get('locationStatus').textContent,/không hỗ trợ/);
}
{
  const h=harness({permission:'denied'});await flush();assert.match(h.nodes.get('locationStatus').textContent,/đang chặn quyền/);
}
{
  const nearby={type:'node',id:123,lat:10.7769,lon:106.7009,tags:{name:'Quán thử'}};
  const distant={type:'node',id:456,lat:11.1,lon:107.1,tags:{name:'Quán xa'}};
  const h=harness({snapshot:{snapshot_date:'2026-10-15',elements:[nearby,distant]},apiError:true});
  await flush();
  assert.equal(h.requests.length,2);
  const result=h.dispatched.find(event=>event.type==='w2e:osm-data')?.detail?.data;
  assert.equal(result?.static_fallback,true);
  assert.equal(result?.elements.length,1);
  assert.match(h.nodes.get('mapStatus').textContent,/1 địa điểm/);
  h.click('refreshMapBtn');await flush();
  assert.match(h.requests.at(-1),/^\/api\/restaurants/);
  assert.match(h.nodes.get('mapStatus').textContent,/1 địa điểm/);
}
{
  const snapshot=JSON.parse(fs.readFileSync(new URL('../assets/data/hcm-food-places.json',import.meta.url),'utf8'));
  const h=harness({snapshot,apiError:true});await flush();
  const result=h.dispatched.find(event=>event.type==='w2e:osm-data')?.detail?.data;
  assert.equal(result?.elements.length,250);
  assert.equal(result?.snapshot_date,'2026-10-15');
  assert.equal(h.requests.length,2);
}
console.log('Map location checks passed: localhost redirect, watched location, accuracy handling, manual selection, refresh and denied permission.');
