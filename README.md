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
- Filtro por estado (todos / en ruta / aproximación) y control de velocidad de la simulación.

## Stack

HTML, CSS y JavaScript puro (sin frameworks ni build). Tipografías Rajdhani y JetBrains Mono desde Google Fonts.

## Despliegue

Al ser un archivo estático, se puede publicar gratis con GitHub Pages: Settings → Pages → Deploy from branch → rama `main`, carpeta raíz.
