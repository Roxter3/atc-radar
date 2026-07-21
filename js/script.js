// ============================================================
// TEXTOS (ES / EN)
// Todo lo que se ve en pantalla vive aquí, en dos idiomas. Los textos
// fijos (etiquetas, títulos de panel) son simples strings. Los mensajes
// de la bitácora son funciones porque necesitan "rellenarse" con datos
// del vuelo (el indicativo, la altitud, etc.) cada vez que se usan.
// ============================================================
const I18N = {
  en: {
    title: "ATC Radar — Live Airspace Monitor",
    brandSub: "SKYWATCH SECTOR CTRL",
    live: "LIVE",
    filterAll: "ALL",
    filterRoute: "EN ROUTE",
    filterApp: "APPROACH",
    speed: "SPEED",
    kpiActive: "Active Flights",
    kpiAlt: "Avg Altitude",
    kpiDescent: "In Descent",
    kpiAlerts: "Alerts",
    airspaceStatus: "Airspace Status",
    activeFlights: "Active Flights",
    rangeTag: "RANGE 80NM",
    sweepTag: "SWEEP 6s · SECTOR SKW-4",
    hint: "click a contact for details",
    trafficLog: "Traffic Log",
    squawk: "Squawk",
    status: "Status",
    type: "Type",
    flightData: "Flight Data",
    route: "Route",
    altitude: "Altitude",
    speedLbl: "Speed",
    heading: "Heading",
    range: "Range",
    recentEvents: "Recent Events",
    dossierFoot: "SIMULATED DATA · DEMO ONLY",
    total: "total",
    compass: { N: "N", S: "S", E: "E", W: "W" },
    statusLabels: { CLIMB: "CLIMB", CRUISE: "CRUISE", DESCENT: "DESCENT", HOLD: "HOLD" },
    sevLabels: { info: "INFO", warn: "WARN", emerg: "EMERG" },
    // cada función arma una línea de bitácora en inglés a partir de los
    // datos del vuelo que le pasemos (indicativo, nivel de vuelo, etc.)
    feed: {
      contactAcquired: () => "Contact acquired, sector entry",
      emergency: (cs) => `${cs} squawking 7700 — EMERGENCY DESCENT`,
      hold: (cs) => `${cs} requesting holding pattern`,
      climb: (cs, fl) => `${cs} cleared to climb, FL${fl}`,
      cruise: (cs, fl) => `${cs} level at FL${fl}`,
      descentTo: (cs, dest) => `${cs} commencing descent to ${dest}`,
      handoffApproach: (cs) => `Handoff — ${cs} to Approach Control`,
      handoffSector: (cs) => `Handoff — ${cs} leaving sector coverage`,
      newContact: (cs, fl) => `New contact — ${cs} inbound, FL${fl}`,
    },
  },
  es: {
    title: "ATC Radar — Monitor de Espacio Aéreo en Vivo",
    brandSub: "SKYWATCH · CONTROL DE SECTOR",
    live: "EN VIVO",
    filterAll: "TODOS",
    filterRoute: "EN RUTA",
    filterApp: "APROXIMACIÓN",
    speed: "VELOCIDAD",
    kpiActive: "Vuelos Activos",
    kpiAlt: "Altitud Promedio",
    kpiDescent: "En Descenso",
    kpiAlerts: "Alertas",
    airspaceStatus: "Estado del Espacio Aéreo",
    activeFlights: "Vuelos Activos",
    rangeTag: "ALCANCE 80NM",
    sweepTag: "BARRIDO 6s · SECTOR SKW-4",
    hint: "haz clic en un contacto para ver el detalle",
    trafficLog: "Bitácora de Tráfico",
    squawk: "Transpondedor",
    status: "Estado",
    type: "Tipo",
    flightData: "Datos del Vuelo",
    route: "Ruta",
    altitude: "Altitud",
    speedLbl: "Velocidad",
    heading: "Rumbo",
    range: "Distancia",
    recentEvents: "Eventos Recientes",
    dossierFoot: "DATOS SIMULADOS · SOLO DEMO",
    total: "total",
    compass: { N: "N", S: "S", E: "E", W: "O" }, // en español el oeste es "O", no "W"
    statusLabels: { CLIMB: "ASCENSO", CRUISE: "CRUCERO", DESCENT: "DESCENSO", HOLD: "ESPERA" },
    sevLabels: { info: "INFO", warn: "ALERTA", emerg: "EMERG" },
    feed: {
      contactAcquired: () => "Contacto adquirido, ingreso al sector",
      emergency: (cs) => `${cs} transpondiendo 7700 — DESCENSO DE EMERGENCIA`,
      hold: (cs) => `${cs} solicita patrón de espera`,
      climb: (cs, fl) => `${cs} autorizado a ascender, FL${fl}`,
      cruise: (cs, fl) => `${cs} nivelado en FL${fl}`,
      descentTo: (cs, dest) => `${cs} inicia descenso hacia ${dest}`,
      handoffApproach: (cs) => `Transferencia — ${cs} a Control de Aproximación`,
      handoffSector: (cs) => `Transferencia — ${cs} sale de cobertura del sector`,
      newContact: (cs, fl) => `Nuevo contacto — ${cs} entrando, FL${fl}`,
    },
  },
};

// si ya habías elegido un idioma antes, lo recordamos entre visitas
function getSavedLang() {
  try {
    const saved = localStorage.getItem("atc-radar-lang");
    if (saved === "es" || saved === "en") return saved;
  } catch (e) {
    // localStorage puede fallar en navegación privada; en ese caso no pasa nada, usamos el default
  }
  return "en";
}

// ============================================================
// DATOS BASE
// Estos son los "ingredientes" con los que armamos vuelos falsos:
// aerolíneas, modelos de avión y aeropuertos. Todo lo demás del
// archivo se apoya en estas listas para inventar tráfico aéreo.
// ============================================================
const AIRLINES = ["DAL", "UAL", "AAL", "SWA", "JBU", "BAW", "AFR", "DLH", "UAE", "QFA", "ANA", "LAT"];
const AIRCRAFT = ["A320", "A321", "A20N", "B738", "B739", "B77W", "B788", "A359", "E195", "CRJ9"];
const AIRPORTS = ["JFK", "LAX", "ORD", "ATL", "DFW", "LHR", "CDG", "FRA", "DXB", "HND", "SYD", "GRU", "MIA", "SEA"];

// Cada estado de vuelo tiene un color fijo (para el radar y las listas).
// La etiqueta de texto que se muestra sale de I18N según el idioma activo.
const STATUS = {
  CLIMB:   { color: "var(--climb)", hex: "#7fe6ff" },
  CRUISE:  { color: "var(--ok)",    hex: "#34ff9c" },
  DESCENT: { color: "var(--warn)",  hex: "#ffb020" },
  HOLD:    { color: "var(--hold)",  hex: "#b98cff" },
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
    // el historial de este vuelo guarda "qué pasó" (kind + args), no el texto ya
    // armado, así podemos traducirlo después si el usuario cambia de idioma
    log: [{ t: nowClock(), kind: "contactAcquired", args: [] }],
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
  selectedId: null,   // id del vuelo que el usuario tiene abierto en la ficha de detalle
  simSpeed: 12,        // multiplicador de velocidad de la simulación (lo controla el slider)
  filter: "all",       // qué vuelos se muestran: all / route / app
  feed: [],            // bitácora de eventos (kind + args, no texto), más reciente primero
  sweepAngle: 0,        // ángulo actual del barrido del radar
  lang: getSavedLang(), // idioma activo de la interfaz
};

// Hora actual en formato "HH:MM:SSZ", como se acostumbra en aviación (hora UTC / Zulu)
function nowClock() {
  return new Date().toISOString().substring(11, 19) + "Z";
}

// Agrega una línea nueva a la bitácora. Guardamos el "tipo" de evento y
// sus datos (kind + args), no el texto final: así, si el usuario cambia
// de idioma después, podemos volver a armar la frase en el otro idioma
// sin perder el historial.
function pushFeed(kind, args, sev = "info") {
  state.feed.unshift({ ts: nowClock(), kind, args, sev });
  if (state.feed.length > 60) state.feed.pop(); // no dejamos crecer la lista para siempre
  renderFeed();
}

// Arma el texto de un evento en el idioma actual. Si hay un indicativo
// de vuelo como primer dato, lo resaltamos en negrita (solo para la
// bitácora general; en la ficha de cada vuelo no hace falta resaltarlo).
function feedText(entry, bold) {
  const fn = I18N[state.lang].feed[entry.kind];
  const args = bold && entry.args.length ? [`<b>${entry.args[0]}</b>`, ...entry.args.slice(1)] : entry.args;
  return fn(...args);
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
      pushFeed("handoffSector", [f.callsign], "info");
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
    pushFeed("newContact", [f.callsign, pad3(Math.round(f.altitude))], "info");
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
  let kind, args, sev = "info";

  if (roll < 0.03) {
    // esto pasa poquísimas veces a propósito, es el "momento dramático" de la demo
    f.emergency = true;
    f.status = "DESCENT";
    f.squawk = "7700"; // 7700 es el código real de emergencia en aviación
    kind = "emergency";
    args = [f.callsign];
    sev = "emerg";
  } else if (roll < 0.10) {
    f.status = "HOLD";
    kind = "hold";
    args = [f.callsign];
    sev = "warn";
  } else if (roll < 0.35) {
    f.status = "CLIMB";
    kind = "climb";
    args = [f.callsign, pad3(Math.round(f.altitude) + 40)];
  } else if (roll < 0.6) {
    f.status = "CRUISE";
    kind = "cruise";
    args = [f.callsign, pad3(Math.round(f.altitude))];
  } else if (roll < 0.85) {
    f.status = "DESCENT";
    kind = "descentTo";
    args = [f.callsign, f.dest];
  } else {
    kind = "handoffApproach";
    args = [f.callsign];
  }

  f.log.unshift({ t: nowClock(), kind, args });
  if (f.log.length > 12) f.log.pop();
  pushFeed(kind, args, sev);

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
//  - bgcv: el fondo (anillos de distancia, cruz, letras N/S/E/O).
//    Se dibuja una vez y se vuelve a dibujar solo si cambia el tamaño
//    o el idioma (las letras de los puntos cardinales cambian en español).
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
// los puntos cardinales. Es "estático": no se anima, pero sí depende
// del idioma (en español el oeste se escribe "O", no "W").
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

  const compass = I18N[state.lang].compass;
  bgx.fillStyle = "rgba(223,245,232,0.5)";
  bgx.font = "600 11px Rajdhani, sans-serif";
  bgx.textAlign = "center";
  bgx.fillText(compass.N, CX, CY - RADIUS_NM * SCALE - 10);
  bgx.fillText(compass.S, CX, CY + RADIUS_NM * SCALE + 18);
  bgx.fillText(compass.E, CX + RADIUS_NM * SCALE + 14, CY + 4);
  bgx.fillText(compass.W, CX - RADIUS_NM * SCALE - 14, CY + 4);
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
// en "state" y lo escriben en el HTML, en el idioma activo.
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

  const t = I18N[state.lang];
  const wrap = document.getElementById("statusBars");
  wrap.innerHTML = Object.entries(STATUS).map(([key, meta]) => `
    <div class="srow">
      <span class="cd" style="color:${meta.color};background:${meta.color}"></span>
      <span class="sn">${t.statusLabels[key]}</span>
      <span class="sv">${counts[key]}</span>
      <span class="bar"><i style="width:${(counts[key] / n) * 100}%;background:${meta.color}"></i></span>
    </div>`).join("");
  document.getElementById("statusN").textContent = `${n} ${t.total}`;
}

// Guardamos la fila (el <div>) de cada vuelo aquí para reutilizarla en
// cada actualización, en vez de destruirla y volverla a crear. Esta
// lista se repinta 10 veces por segundo (va de la mano con la
// simulación), y si cada vez tirábamos todo el HTML y lo armábamos de
// nuevo, el navegador perdía el estado de ":hover" apenas pasabas el
// cursor (el parpadeo), y el clic a veces "caía" sobre un elemento que
// ya no existía porque se había reemplazado justo entre que lo
// presionabas y lo soltabas.
const flightRowEls = new Map();

function renderFlightList() {
  const wrap = document.getElementById("flightList");
  const sorted = [...state.flights].sort((a, b) => b.altitude - a.altitude);
  const seenIds = new Set();

  sorted.forEach((f, index) => {
    seenIds.add(f.id);
    let row = flightRowEls.get(f.id);

    if (!row) {
      // primera vez que aparece este vuelo en la lista: se crea una sola vez
      row = document.createElement("div");
      row.className = "frow";
      row.innerHTML = `<span class="cd"></span><span class="cs"></span><span class="al"></span>`;
      row.addEventListener("click", () => selectFlight(f.id));
      flightRowEls.set(f.id, row);
    }

    // en cada actualización solo cambiamos el contenido, nunca el elemento
    row.classList.toggle("sel", state.selectedId === f.id);
    const dot = row.querySelector(".cd");
    dot.style.color = STATUS[f.status].color;
    dot.style.background = STATUS[f.status].color;
    row.querySelector(".cs").textContent = f.callsign;
    row.querySelector(".al").textContent = `FL${pad3(Math.round(f.altitude))}`;

    // Solo tocamos el DOM si esta fila NO está ya en el lugar que le toca.
    // "appendChild" (o "insertBefore") mueve el nodo aunque ya esté en su
    // sitio: por dentro, el navegador igual lo saca y lo vuelve a meter, y
    // eso alcanza para cortar la transición de ":hover" a la mitad (el
    // parpadeo). Comparando contra el vecino de al lado, nos ahorramos
    // ese movimiento innecesario en los 9 de cada 10 casos en que el
    // orden de la lista no cambió respecto al render anterior.
    const refNode = wrap.children[index];
    if (refNode !== row) {
      wrap.insertBefore(row, refNode || null);
    }
  });

  // los vuelos que ya salieron del radar se quitan de la lista
  for (const [id, row] of flightRowEls) {
    if (!seenIds.has(id)) {
      row.remove();
      flightRowEls.delete(id);
    }
  }

  document.getElementById("flightN").textContent = state.flights.length;
}

function renderFeed() {
  const t = I18N[state.lang];
  const wrap = document.getElementById("feedList");
  wrap.innerHTML = state.feed.map((e) => `
    <div class="ev">
      <span class="ts">${e.ts}</span>
      <span class="tx">${feedText(e, true)}</span>
      <span class="sev ${e.sev}">${t.sevLabels[e.sev]}</span>
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

  const t = I18N[state.lang];
  dossier.classList.remove("hidden");
  document.getElementById("dsrTitle").textContent = f.callsign;
  document.getElementById("dsrSub").textContent = `${f.orig} → ${f.dest}`;
  document.getElementById("dsrSquawk").textContent = f.squawk;
  document.getElementById("dsrStatus").textContent = t.statusLabels[f.status];
  document.getElementById("dsrType").textContent = f.aircraft;
  document.getElementById("dsrRoute").textContent = `${f.orig} → ${f.dest}`;
  document.getElementById("dsrAlt").textContent = `FL${pad3(Math.round(f.altitude))}`;
  document.getElementById("dsrSpeed").textContent = `${f.speed} kt`;
  document.getElementById("dsrHeading").textContent = `${Math.round(f.heading)}°`;
  document.getElementById("dsrRange").textContent = `${Math.round(Math.hypot(f.x, f.y))} NM`;
  document.getElementById("dsrLog").innerHTML = f.log.map((l) => `
    <div class="dlog"><div class="t">${l.t}</div>${feedText(l, false)}</div>`).join("");
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

// ---------- botón de idioma ----------
// Cambia el idioma activo y vuelve a pintar todo lo que tiene texto:
// las etiquetas fijas del HTML (marcadas con data-i18n), el fondo del
// radar (por las letras N/S/E/O) y los paneles que se arman con
// JavaScript (KPIs, lista de vuelos, bitácora, ficha de detalle).
function applyLanguage(lang) {
  state.lang = lang;
  document.documentElement.lang = lang;
  document.title = I18N[lang].title;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = I18N[lang][el.dataset.i18n];
  });
  document.querySelectorAll("#langSeg button").forEach((b) => {
    b.classList.toggle("on", b.dataset.lang === lang);
  });

  if (W && H) drawBackground(); // redibuja las letras del compás en el idioma nuevo
  renderKPIs();
  renderStatusBars();
  renderFlightList();
  renderFeed();
  renderDossier();

  try {
    localStorage.setItem("atc-radar-lang", lang);
  } catch (e) {
    // si el navegador bloquea localStorage no pasa nada grave, solo no se recuerda la próxima vez
  }
}

document.getElementById("langSeg").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  applyLanguage(btn.dataset.lang);
});

// ---------- arrastrar para agrandar la barra lateral y la bitácora ----------
// El ancho de la barra lateral y el alto de la bitácora viven en las
// variables CSS --side-w y --feed-h (ver css/styles.css). Esta función
// genérica engancha una "tirita" (vsizer u hsizer) para que, al
// arrastrarla, vaya cambiando esa variable dentro de los límites
// mínimo/máximo. El canvas del radar no necesita que le avisemos: ya
// tiene un ResizeObserver mirando el tamaño de #stage (ver resize()
// más arriba), así que se ajusta solo apenas el grid cambia de tamaño.
const MIN_SIDE_W = 220, MAX_SIDE_W = 520;
const MIN_FEED_H = 90, MAX_FEED_H = 420;

function setupResizer({ handle, cssVar, min, max, getValue, storageKey }) {
  let dragging = false;

  function apply(value) {
    const clamped = Math.min(max, Math.max(min, value));
    document.documentElement.style.setProperty(cssVar, `${clamped}px`);
    // Cambiar esta variable CSS mueve el radar (#stage) de tamaño, pero el
    // ResizeObserver de más arriba no siempre se entera al instante de un
    // cambio de tamaño "de grid" como este (sí funciona bien cuando se
    // redimensiona la ventana entera). Para que el radar no se vea
    // recortado mientras arrastras, le avisamos nosotros mismos.
    resize();
  }

  function start(e) {
    dragging = true;
    handle.classList.add("dragging");
    document.body.style.userSelect = "none"; // para no seleccionar texto sin querer mientras se arrastra
    e.preventDefault();
  }

  function stop() {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("dragging");
    document.body.style.userSelect = "";
    try {
      localStorage.setItem(storageKey, document.documentElement.style.getPropertyValue(cssVar));
    } catch (e) {
      // si el navegador bloquea localStorage no pasa nada grave, solo no se recuerda la próxima vez
    }
  }

  handle.addEventListener("mousedown", start);
  window.addEventListener("mousemove", (e) => {
    if (dragging) apply(getValue(e.clientX, e.clientY));
  });
  window.addEventListener("mouseup", stop);

  // lo mismo pero para pantallas táctiles (tablet con touch, por ejemplo)
  handle.addEventListener("touchstart", start, { passive: false });
  window.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    apply(getValue(t.clientX, t.clientY));
    e.preventDefault();
  }, { passive: false });
  window.addEventListener("touchend", stop);

  // si ya se había elegido un tamaño antes, lo recordamos entre visitas
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) document.documentElement.style.setProperty(cssVar, saved);
  } catch (e) {
    // si falla, se usa el tamaño por defecto, sin problema
  }
}

setupResizer({
  handle: document.getElementById("vsizer"),
  cssVar: "--side-w",
  min: MIN_SIDE_W,
  max: MAX_SIDE_W,
  getValue: (clientX) => clientX, // la barra lateral empieza en el borde izquierdo, así que su ancho es directo la posición X del cursor
  storageKey: "atc-radar-side-w",
});

setupResizer({
  handle: document.getElementById("hsizer"),
  cssVar: "--feed-h",
  min: MIN_FEED_H,
  max: MAX_FEED_H,
  getValue: (clientX, clientY) => window.innerHeight - clientY, // la bitácora está pegada abajo, así que su alto es la distancia del cursor al borde inferior
  storageKey: "atc-radar-feed-h",
});

// ============================================================
// ARRANQUE
// Todo lo de arriba solo define funciones y datos; aquí es donde de
// verdad "encendemos" la página: primer dibujo, primer idioma
// aplicado (que ya deja todo pintado en pantalla), y los dos bucles
// que mantienen todo vivo.
// ============================================================
resize();
tickClock();
applyLanguage(state.lang);

requestAnimationFrame(drawFrame);                    // bucle de dibujo (va a la velocidad de la pantalla)
setInterval(() => simulate(performance.now()), 100); // bucle de simulación (10 veces por segundo)
