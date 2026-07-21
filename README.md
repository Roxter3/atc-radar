# ATC Radar — Live Airspace Monitor

Panel de control de vuelos estilo torre de control aérea, con un radar animado, lista de vuelos activos, panel de detalle por vuelo y una bitácora de eventos en vivo. Todos los datos son simulados con JavaScript (no usa una API real de vuelos).

## Ver la demo

Es una sola página, sin dependencias ni instalación. Basta con abrir `index.html` en el navegador, o servirla con cualquier servidor estático:

```bash
npx serve .
```

## Qué tiene

- Radar en `<canvas>` con anillos de distancia, barrido giratorio con estela y aviones que se mueven según su rumbo y velocidad.
- Panel lateral con indicadores (vuelos activos, altitud promedio, en descenso, alertas) y el desglose de estados (ascenso, crucero, descenso, espera).
- Lista de vuelos activos: al hacer clic (o al hacer clic sobre un contacto en el radar) se abre un panel de detalle con ruta, altitud, velocidad, rumbo y transpondedor (squawk).
- Bitácora de eventos en vivo (despegues, cambios de altitud, alertas de emergencia simuladas).
- Filtro por estado (todos / en ruta / aproximación) y control de velocidad de la simulación. Con "Aproximación" activo, la lista de vuelos se convierte en la secuencia real de aterrizaje: ordenada por quién está más cerca de la torre, numerada, tal como la maneja un controlador (no algo que un piloto vea de los demás aviones).
- Interfaz bilingüe (inglés / español) con un botón para cambiar de idioma; recuerda tu elección la próxima vez que abras la página.
- Responsive: en tablet y celular el encabezado se acomoda en varias líneas, los indicadores se vuelven una fila con scroll horizontal, y se puede seguir seleccionando un vuelo tocando directamente sobre el radar.
- En pantallas grandes, la barra lateral y la bitácora de tráfico se pueden agrandar o achicar arrastrando el borde entre paneles; el tamaño elegido se recuerda entre visitas.
- Alerta de conflicto de tráfico (STCA): si dos aviones quedan a menos de 5 millas náuticas Y menos de 1000 pies de diferencia de altitud al mismo tiempo, el sistema los marca en el radar (anillo punteado y línea entre ambos), lo anuncia en la bitácora y suma a un indicador de alertas que resplandece mientras siga activo. Es una función propia de un controlador en tierra, distinta del aviso que recibe un piloto de su propio avión.
- Límite de sector visible en el radar: el borde de los 80NM de alcance se dibuja como un límite real, con los sectores vecinos (SKW-2, SKW-6, SKW-8, SKW-9) marcados en las diagonales, para que las transferencias que ya se ven en la bitácora tengan también un lugar concreto en el mapa.
- Frecuencia activa: debajo del radar se muestra qué controlador tendría estos vuelos en la realidad ("CTR 124.35" en ruta, "APP 118.70" en aproximación), y cambia sola según el filtro elegido.
- Reporte de clima estilo METAR (viento, visibilidad, presión), que varía lentamente con el tiempo para sentirse en vivo.
- Pista propia en el centro del radar: los vuelos en descenso ahora se vectorean de verdad hacia ahí (dejan de volar con rumbo libre y van girando hacia la pista), y al llegar lo bastante cerca y bajo, aterrizan (se anuncia en la bitácora y se reemplazan por un contacto nuevo).

## Stack

HTML, CSS y JavaScript puro (sin frameworks ni build). Tipografías Rajdhani y JetBrains Mono desde Google Fonts.

## Estructura del proyecto

```
atc-radar/
├── index.html      estructura de la página
├── css/
│   └── styles.css  todos los estilos
└── js/
    └── script.js   simulación de vuelos, dibujo del radar y la interfaz
```

## Despliegue

Al ser un archivo estático, se puede publicar gratis con GitHub Pages: Settings → Pages → Deploy from branch → rama `main`, carpeta raíz.
