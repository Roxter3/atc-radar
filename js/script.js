// ============================================================
// DATOS BASE
// Estos son los "ingredientes" con los que armamos vuelos falsos:
// aerolíneas, modelos de avión y aeropuertos. Todo lo demás del
// archivo se apoya en estas listas para inventar tráfico aéreo.
// ============================================================
const AIRLINES = ["DAL", "UAL", "AAL", "SWA", "JBU", "BAW", "AFR", "DLH", "UAE", "QFA", "ANA", "LAT"];
const AIRCRAFT = ["A320", "A321", "A20N", "B738", "B739", "B77W", "B788", "A359", "E195", "CRJ9"];
const AIRPORTS = ["JFK", "LAX", "ORD", "ATL", "DFW", "LHR", "CDG", "FRA", "DXB", "HND", "SYD", "GRU", "MIA", "SEA"];

// Cada estado de vuelo tiene su color (para el radar y las listas) y
// su etiqueta de texto. Guardar el color en hexadecimal (además de la
// variable CSS) nos evita tener que preguntarle al navegador el color
// cada vez que dibujamos un avión en el canvas, que sería lento.
const STATUS = {
  CLIMB:   { color: "var(--climb)", hex: "#7fe6ff", label: "CLIMB"   },
  CRUISE:  { color: "var(--ok)",    hex: "#34ff9c", label: "CRUISE"  },
  DESCENT: { color: "var(--warn)",  hex: "#ffb020", label: "DESCENT" },
  HOLD:    { color: "var(--hold)",  hex: "#b98cff", label: "HOLD"    },
};

const RADIUS_NM = 80;   // "alcance" del radar, en millas náuticas
const MIN_FLIGHTS = 7;  // nunca queremos que el radar se quede vacío
const MAX_FLIGHTS = 13; // ni tampoco saturado de aviones

// pequeños ayudantes para no repetir Math.random() por todos lados
const rnd = (a, b) => Math.random() * (b - a) + a;
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[rndInt(0, arr.length - 1)];

// ============================================================
// CREACIÓN DE VUELOS
// ============================================================
let nextId = 1;

// Inventa un vuelo nuevo: le da un indicativo, un avión, una posición
// al azar dentro del radar, y una ruta de origen/destino.
function createFlight() {
  const airline = pick(AIRLINES);
  const status = pick(Object.keys(STATUS));
  const angle = rnd(0, 360);
  const dist = rnd(15, RADIUS_NM * 0.95); // que no aparezca justo en el borde ni en el centro
  const [orig, dest] = pickRoute();

  return {
    id: nextId++,
    callsign: airline + rndInt(100, 999),
    aircraft: pick(AIRCRAFT),
    squawk: `${rndInt(0, 7)}${rndInt(0, 7)}${rndInt(0, 7)}${rndInt(0, 7)}`, // código de transpondedor, siempre dígitos 0-7
    status,
    // según el estado, arrancamos en una altitud que tenga sentido
    altitude: status === "CLIMB" ? rndInt(80, 280) : status === "DESCENT" ? rndInt(60, 250) : rndInt(180, 410),
    speed: rndInt(220, 520), // nudos
    heading: rnd(0, 360),    // rumbo, en grados, 0 = norte
    // convertimos ángulo + distancia (coordenadas polares) a x,y para
    // poder mover el avión más fácil después con solo sumar/restar
    x: Math.sin(angle * Math.PI / 180) * dist,
    y: -Math.cos(angle * Math.PI / 180) * dist,
    orig,
    dest,
    emergency: false,
    lastSweepHit: -999, // último momento en que el barrido "iluminó" a este avión
    log: [{ t: nowClock(), text: "Contact acquired, sector entry" }],
  };
}

// Elige un origen y un destino que no sean el mismo aeropuerto
function pickRoute() {
  const a = pick(AIRPORTS);
  let b = pick(AIRPORTS);
  while (b === a) b = pick(AIRPORTS);
  return [a, b];
}

// ============================================================
// ESTADO GLOBAL
// Un solo objeto que guarda todo lo que puede cambiar mientras la
// página está abierta. Las funciones de "render" más abajo leen de
// aquí para actualizar la pantalla.
// ============================================================
const state = {
  flights: [],
  selectedId: null, // id del vuelo que el usuario tiene abierto en la ficha de detalle
  simSpeed: 12,      // multiplicador de velocidad de la simulación (lo controla el slider)
  filter: "all",     // qué vuelos se muestran: all / route / app
  feed: [],          // bitácora de eventos, más reciente primero
  sweepAngle: 0,      // ángulo actual del barrido del radar
};

// Hora actual en formato "HH:MM:SSZ", como se acostumbra en aviación (hora UTC / Zulu)
function nowClock() {
  return new Date().toISOString().substring(11, 19) + "Z";
}

// Agrega una línea nueva a la bitácora y refresca esa parte de la pantalla
function pushFeed(text, sev = "info") {
  state.feed.unshift({ ts: nowClock(), text, sev });
  if (state.feed.length > 60) state.feed.pop(); // no dejamos crecer la lista para siempre
  renderFeed();
}

// arrancamos con 9 vuelos ya en el aire, para que el radar no empiece vacío
for (let i = 0; i < 9; i++) state.flights.push(createFlight());

// ============================================================
// SIMULACIÓN
// Esta parte corre cada 100ms (ver setInterval al final del archivo).
// Mueve cada avión según su rumbo y velocidad, gira el barrido del
// radar, y de vez en cuando genera eventos y vuelos nuevos.
// ============================================================
let lastTick = performance.now();

function simulate(now) {
  // dtReal = segundos reales que pasaron desde la última vez que corrimos esto.
  // Lo limitamos a un cuarto de segundo por si el navegador se traba un
  // instante (así evitamos que un avión "salte" de golpe muy lejos).
  const dtReal = Math.min((now - lastTick) / 1000, 0.25);
  lastTick = now;
  const dt = dtReal * state.simSpeed; // tiempo "de simulación", ya acelerado por el slider

  state.sweepAngle = (state.sweepAngle + dt * 60) % 360;

  for (const f of state.flights) {
    // velocidad en nudos -> millas náuticas por segundo, para poder
    // sumarla directo a la posición x,y del avión
    const nmPerSec = f.speed / 3600;
    f.x += Math.sin(f.heading * Math.PI / 180) * nmPerSec * dt;
    f.y -= Math.cos(f.heading * Math.PI / 180) * nmPerSec * dt;
    // un rumbo que se bambolea un poquito, para que no vuelen en línea perfectamente recta
    f.heading = (f.heading + rnd(-dt * 0.6, dt * 0.6) + 360) % 360;
    if (f.status === "CLIMB") f.altitude = Math.min(410, f.altitude + dt * 0.6);
    if (f.status === "DESCENT") f.altitude = Math.max(20, f.altitude - dt * 0.6);
  }

  // si un avión se sale del alcance del radar, lo damos de baja (como si
  // hiciera "handoff" al siguiente sector) y ponemos uno nuevo en su lugar
  const dist = (f) => Math.hypot(f.x, f.y);
  for (const f of [...state.flights]) {
    if (dist(f) > RADIUS_NM * 1.05) {
      pushFeed(`Handoff — <b>${f.callsign}</b> leaving sector coverage`, "info");
      removeFlight(f.id);
      state.flights.push(createFlight());
    }
  }

  maybeSpawn(dtReal);
  maybeEvent(dtReal);
  renderKPIs();
  renderStatusBars();
  renderFlightList();
}

// De vez en cuando aparece un vuelo nuevo entrando al sector, y si por
// alguna razón nos quedamos con muy pocos, rellenamos sin avisar (para
// no llenar la bitácora de ruido).
let spawnTimer = rnd(4, 8);
function maybeSpawn(dtReal) {
  spawnTimer -= dtReal * state.simSpeed / 8;
  if (spawnTimer <= 0 && state.flights.length < MAX_FLIGHTS) {
    const f = createFlight();
    state.flights.push(f);
    pushFeed(`New contact — <b>${f.callsign}</b> inbound, FL${pad3(Math.round(f.altitude))}`, "info");
    spawnTimer = rnd(5, 11);
  }
  if (state.flights.length < MIN_FLIGHTS) {
    state.flights.push(createFlight());
  }
}

// Cada tanto le pasa "algo" a un vuelo al azar: sube, baja, pide espera,
// o rarísima vez declara una emergencia. Esto es lo que va llenando la
// bitácora de abajo y le da vida a la simulación.
let eventTimer = rnd(3, 6);
function maybeEvent(dtReal) {
  eventTimer -= dtReal * state.simSpeed / 8;
  if (eventTimer > 0 || state.flights.length === 0) return;
  eventTimer = rnd(3, 7);

  const f = pick(state.flights);
  const roll = Math.random();
  let text, sev = "info";

  if (roll < 0.03) {
    // esto pasa poquísimas veces a propósito, es el "momento dramático" de la demo
    f.emergency = true;
    f.status = "DESCENT";
    f.squawk = "7700"; // 7700 es el código real de emergencia en aviación
    text = `<b>${f.callsign}</b> squawking 7700 — EMERGENCY DESCENT`;
    sev = "emerg";
  } else if (roll < 0.10) {
    text = `<b>${f.callsign}</b> requesting holding pattern`;
    f.status = "HOLD";
    sev = "warn";
  } else if (roll < 0.35) {
    f.status = "CLIMB";
    text = `<b>${f.callsign}</b> cleared to climb, FL${pad3(Math.round(f.altitude) + 40)}`;
  } else if (roll < 0.6) {
    f.status = "CRUISE";
    text = `<b>${f.callsign}</b> level at FL${pad3(Math.round(f.altitude))}`;
  } else if (roll < 0.85) {
    f.status = "DESCENT";
    text = `<b>${f.callsign}</b> commencing descent to ${f.dest}`;
  } else {
    text = `Handoff — <b>${f.callsign}</b> to Approach Control`;
  }

  // guardamos el mismo texto pero sin las etiquetas <b> en el historial propio del vuelo
  f.log.unshift({ t: nowClock(), text: text.replace(/<\/?b>/g, "") });
  if (f.log.length > 12) f.log.pop();
  pushFeed(text, sev);

  // si el vuelo al que le acaba de pasar algo es el que el usuario tiene
  // abierto en la ficha, refrescamos la ficha para que se vea al instante
  if (state.selectedId === f.id) renderDossier();
}

// pad3(7) -> "007", para mostrar los niveles de vuelo como "FL070"
function pad3(n) {
  return String(Math.max(0, n)).padStart(3, "0");
}

function removeFlight(id) {
  state.flights = state.flights.filter((f) => f.id !== id);
  if (state.selectedId === id) selectFlight(null); // si borramos el vuelo seleccionado, cerramos la ficha
}

// ============================================================
// CANVAS DEL RADAR
// Usamos dos <canvas> superpuestos:
//  - bgcv: el fondo (anillos de distancia, cruz, letras N/S/E/W).
//    Se dibuja una sola vez y solo se vuelve a dibujar si cambia el tamaño.
//  - fgcv: lo que se mueve (barrido giratorio y aviones). Se redibuja
//    entero en cada fotograma, muchas veces por segundo.
// Separarlos así ahorra trabajo: no hace falta redibujar los anillos
// 60 veces por segundo si nunca cambian.
// ============================================================
const stage = document.getElementById("stage");
const bgcv = document.getElementById("bgcv");
const fgcv = document.getElementById("fgcv");
const bgx = bgcv.getContext("2d");
const fgx = fgcv.getContext("2d");
let W = 0, H = 0, CX = 0, CY = 0, SCALE = 1;

// Ajusta el tamaño real del canvas al tamaño visible en pantalla, y
// calcula cuántos píxeles equivalen a una milla náutica (SCALE), que
// es lo que usamos después para ubicar cada avión en el dibujo.
function resize() {
  const r = stage.getBoundingClientRect();
  // Si todavía no tenemos un tamaño real (por ejemplo, el primerísimo
  // instante en que la página está cargando y el layout no terminó de
  // acomodarse), mejor no dibujar nada raro: esperamos a que el
  // ResizeObserver nos avise de nuevo con una medida válida.
  if (r.width < 20 || r.height < 20) return;
  W = bgcv.width = fgcv.width = r.width;
  H = bgcv.height = fgcv.height = r.height;
  CX = W / 2;
  CY = H / 2;
  SCALE = (Math.min(W, H) / 2 - 30) / RADIUS_NM;
  drawBackground();
}
// ResizeObserver avisa cada vez que el contenedor del radar cambia de
// tamaño (ventana redimensionada, cambio de layout en celular, etc.)
new ResizeObserver(resize).observe(stage);

// Dibuja los anillos de distancia, la cruz central y las letras de
// los puntos cardinales. Es "estático": no se anima.
function drawBackground() {
  bgx.clearRect(0, 0, W, H);
  bgx.strokeStyle = "rgba(52,255,156,0.16)";
  bgx.fillStyle = "rgba(130,172,151,0.55)";
  bgx.font = "9px JetBrains Mono, monospace";
  bgx.lineWidth = 1;

  for (let i = 1; i <= 4; i++) {
    const r = (RADIUS_NM / 4) * i * SCALE;
    bgx.beginPath();
    bgx.arc(CX, CY, r, 0, Math.PI * 2);
    bgx.stroke();
    bgx.fillText(`${Math.round((RADIUS_NM / 4) * i)}NM`, CX + 4, CY - r + 10);
  }

  bgx.beginPath();
  bgx.moveTo(CX, CY - RADIUS_NM * SCALE);
  bgx.lineTo(CX, CY + RADIUS_NM * SCALE);
  bgx.moveTo(CX - RADIUS_NM * SCALE, CY);
  bgx.lineTo(CX + RADIUS_NM * SCALE, CY);
  bgx.stroke();

  bgx.fillStyle = "rgba(223,245,232,0.5)";
  bgx.font = "600 11px Rajdhani, sans-serif";
  bgx.textAlign = "center";
  bgx.fillText("N", CX, CY - RADIUS_NM * SCALE - 10);
  bgx.fillText("S", CX, CY + RADIUS_NM * SCALE + 18);
  bgx.fillText("E", CX + RADIUS_NM * SCALE + 14, CY + 4);
  bgx.fillText("W", CX - RADIUS_NM * SCALE - 14, CY + 4);
  bgx.textAlign = "left";
}

// Decide si un vuelo se debe mostrar según el filtro elegido arriba
// (ALL / EN ROUTE / APPROACH). Se usa tanto para dibujar en el radar
// como para saber en qué vuelos se puede hacer clic.
function isVisible(f) {
  if (state.filter === "route") return f.status === "CLIMB" || f.status === "CRUISE";
  if (state.filter === "app") return f.status === "DESCENT" || f.status === "HOLD";
  return true;
}

// El corazón visual del radar: se llama una y otra vez con
// requestAnimationFrame, así que corre a la velocidad de refresco de
// la pantalla (normalmente 60 veces por segundo).
function drawFrame() {
  fgx.clearRect(0, 0, W, H);

  // Barrido con "estela": en vez de una sola línea, dibujamos muchas
  // cuñas finitas detrás del ángulo actual, cada vez más transparentes.
  // Es el mismo truco visual de los radares antiguos de fósforo verde.
  const sweepRad = state.sweepAngle * Math.PI / 180;
  const R = RADIUS_NM * SCALE;
  for (let i = 0; i < 26; i++) {
    const a = sweepRad - (i / 26) * (Math.PI / 3.2);
    fgx.beginPath();
    fgx.moveTo(CX, CY);
    fgx.arc(CX, CY, R, a - 0.012, a + 0.012);
    fgx.closePath();
    fgx.fillStyle = `rgba(52,255,156,${0.14 * (1 - i / 26)})`;
    fgx.fill();
  }
  fgx.strokeStyle = "rgba(52,255,156,0.9)";
  fgx.lineWidth = 1.4;
  fgx.beginPath();
  fgx.moveTo(CX, CY);
  fgx.lineTo(CX + Math.sin(sweepRad) * R, CY - Math.cos(sweepRad) * R);
  fgx.stroke();

  for (const f of state.flights) {
    if (!isVisible(f)) continue;
    const px = CX + f.x * SCALE, py = CY + f.y * SCALE;

    // ¿el barrido acaba de pasar justo por encima de este avión? si sí,
    // lo marcamos como "recién iluminado" para que brille un momento,
    // como pasa en un radar de verdad.
    const diff = Math.abs(((state.sweepAngle - angleTo(f) + 540) % 360) - 180);
    if (diff < 4) f.lastSweepHit = performance.now();
    const hit = performance.now() - f.lastSweepHit < 700;
    const resolved = f.emergency ? "#ff4d5e" : STATUS[f.status].hex;

    // aro de selección, para el vuelo que el usuario tiene abierto
    if (state.selectedId === f.id) {
      fgx.beginPath();
      fgx.arc(px, py, 13, 0, Math.PI * 2);
      fgx.strokeStyle = "rgba(52,255,156,0.9)";
      fgx.lineWidth = 1.5;
      fgx.stroke();
    }
    // halo suave cuando el barrido lo ilumina, o si está en emergencia
    if (hit || f.emergency) {
      fgx.beginPath();
      fgx.arc(px, py, f.emergency ? 11 : 8, 0, Math.PI * 2);
      fgx.fillStyle = f.emergency ? "rgba(255,77,94,0.25)" : "rgba(52,255,156,0.22)";
      fgx.fill();
    }

    // el avión en sí: un triangulito rotado según su rumbo
    fgx.save();
    fgx.translate(px, py);
    fgx.rotate(f.heading * Math.PI / 180);
    fgx.beginPath();
    fgx.moveTo(0, -6);
    fgx.lineTo(4, 5);
    fgx.lineTo(0, 2);
    fgx.lineTo(-4, 5);
    fgx.closePath();
    fgx.fillStyle = resolved;
    fgx.shadowColor = resolved;
    fgx.shadowBlur = f.emergency ? 12 : 6;
    fgx.fill();
    fgx.restore();

    // indicativo y altitud, como etiqueta al lado del avión
    fgx.shadowBlur = 0;
    fgx.font = "10px JetBrains Mono, monospace";
    fgx.fillStyle = "rgba(223,245,232,0.85)";
    fgx.fillText(f.callsign, px + 9, py - 6);
    fgx.fillStyle = "rgba(130,172,151,0.8)";
    fgx.fillText(`FL${pad3(Math.round(f.altitude))}`, px + 9, py + 6);
  }

  requestAnimationFrame(drawFrame); // y así, siguiente fotograma
}

// Convierte la posición x,y de un avión (relativa al centro) en un
// ángulo de brújula (0° = norte), para saber si el barrido ya pasó por ahí.
function angleTo(f) {
  return (Math.atan2(f.x, -f.y) * 180 / Math.PI + 360) % 360;
}

// Clic sobre el radar: buscamos el avión visible más cercano al punto
// donde hizo clic, y si está razonablemente cerca (16px), lo seleccionamos.
fgcv.addEventListener("click", (e) => {
  const rect = fgcv.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  let closest = null, best = 16;
  for (const f of state.flights) {
    if (!isVisible(f)) continue;
    const px = CX + f.x * SCALE, py = CY + f.y * SCALE;
    const d = Math.hypot(mx - px, my - py);
    if (d < best) { best = d; closest = f; }
  }
  if (closest) selectFlight(closest.id);
});

// ============================================================
// INTERFAZ: KPIs, listas y bitácora
// Estas funciones no calculan nada nuevo, solo toman lo que ya hay
// en "state" y lo escriben en el HTML.
// ============================================================
function renderKPIs() {
  const n = state.flights.length;
  document.getElementById("kpiActive").textContent = n;
  const avgAlt = n ? Math.round(state.flights.reduce((s, f) => s + f.altitude, 0) / n) : 0;
  document.getElementById("kpiAlt").textContent = `FL${pad3(avgAlt)}`;
  document.getElementById("kpiDescent").textContent = state.flights.filter((f) => f.status === "DESCENT").length;
  document.getElementById("kpiAlerts").textContent = state.flights.filter((f) => f.emergency).length;
}

function renderStatusBars() {
  const n = state.flights.length || 1; // evitar dividir entre cero si no hay vuelos
  const counts = { CLIMB: 0, CRUISE: 0, DESCENT: 0, HOLD: 0 };
  for (const f of state.flights) counts[f.status]++;

  const wrap = document.getElementById("statusBars");
  wrap.innerHTML = Object.entries(STATUS).map(([key, meta]) => `
    <div class="srow">
      <span class="cd" style="color:${meta.color};background:${meta.color}"></span>
      <span class="sn">${meta.label}</span>
      <span class="sv">${counts[key]}</span>
      <span class="bar"><i style="width:${(counts[key] / n) * 100}%;background:${meta.color}"></i></span>
    </div>`).join("");
  document.getElementById("statusN").textContent = n + " total";
}

function renderFlightList() {
  const wrap = document.getElementById("flightList");
  const sorted = [...state.flights].sort((a, b) => b.altitude - a.altitude);

  wrap.innerHTML = sorted.map((f) => `
    <div class="frow ${state.selectedId === f.id ? "sel" : ""}" data-id="${f.id}">
      <span class="cd" style="color:${STATUS[f.status].color};background:${STATUS[f.status].color}"></span>
      <span class="cs">${f.callsign}</span>
      <span class="al">FL${pad3(Math.round(f.altitude))}</span>
    </div>`).join("");

  document.getElementById("flightN").textContent = state.flights.length;

  // como reescribimos todo el HTML de la lista arriba, los eventos de
  // clic anteriores se perdieron; hay que volver a engancharlos
  wrap.querySelectorAll(".frow").forEach((row) => {
    row.addEventListener("click", () => selectFlight(Number(row.dataset.id)));
  });
}

function renderFeed() {
  const wrap = document.getElementById("feedList");
  wrap.innerHTML = state.feed.map((e) => `
    <div class="ev">
      <span class="ts">${e.ts}</span>
      <span class="tx">${e.text}</span>
      <span class="sev ${e.sev}">${e.sev}</span>
    </div>`).join("");
  document.getElementById("feedN").textContent = state.feed.length;
}

// Marca un vuelo como "seleccionado" (o ninguno, si id es null) y
// refresca lo que depende de eso: la lista (para resaltarlo) y la ficha.
function selectFlight(id) {
  state.selectedId = id;
  renderFlightList();
  renderDossier();
}

function renderDossier() {
  const dossier = document.getElementById("dossier");
  const f = state.flights.find((fl) => fl.id === state.selectedId);

  if (!f) {
    dossier.classList.add("hidden");
    return;
  }

  dossier.classList.remove("hidden");
  document.getElementById("dsrTitle").textContent = f.callsign;
  document.getElementById("dsrSub").textContent = `${f.orig} → ${f.dest}`;
  document.getElementById("dsrSquawk").textContent = f.squawk;
  document.getElementById("dsrStatus").textContent = STATUS[f.status].label;
  document.getElementById("dsrType").textContent = f.aircraft;
  document.getElementById("dsrRoute").textContent = `${f.orig} → ${f.dest}`;
  document.getElementById("dsrAlt").textContent = `FL${pad3(Math.round(f.altitude))}`;
  document.getElementById("dsrSpeed").textContent = `${f.speed} kt`;
  document.getElementById("dsrHeading").textContent = `${Math.round(f.heading)}°`;
  document.getElementById("dsrRange").textContent = `${Math.round(Math.hypot(f.x, f.y))} NM`;
  document.getElementById("dsrLog").innerHTML = f.log.map((l) => `
    <div class="dlog"><div class="t">${l.t}</div>${l.text}</div>`).join("");
}

document.getElementById("dsrClose").addEventListener("click", () => selectFlight(null));

// ---------- controles del encabezado ----------
document.getElementById("speedRange").addEventListener("input", (e) => {
  state.simSpeed = Number(e.target.value);
  document.getElementById("speedVal").textContent = `×${state.simSpeed}`;
});

document.getElementById("filterSeg").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  document.querySelectorAll("#filterSeg button").forEach((b) => b.classList.remove("on"));
  btn.classList.add("on");
  state.filter = btn.dataset.f;
});

function tickClock() {
  document.getElementById("utcClock").textContent = nowClock();
}
setInterval(tickClock, 1000);

// ============================================================
// ARRANQUE
// Todo lo de arriba solo define funciones y datos; aquí es donde de
// verdad "encendemos" la página: primer dibujo, primeros datos en
// pantalla, y los dos bucles que mantienen todo vivo.
// ============================================================
resize();
tickClock();
renderKPIs();
renderStatusBars();
renderFlightList();
renderFeed();

requestAnimationFrame(drawFrame);            // bucle de dibujo (va a la velocidad de la pantalla)
setInterval(() => simulate(performance.now()), 100); // bucle de simulación (10 veces por segundo)
