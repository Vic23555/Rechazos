# Dashboard de rechazos BPI

Dashboard estático y adaptable a móvil, construido con HTML, CSS y JavaScript puro. Está preparado para publicarse con **GitHub Pages**, sin servidor, base de datos, npm ni dependencias externas.

## Qué contiene

- KPI global por cada valor de `ARCHIVO ORIGEN`.
- Filtros combinables de región, determinante y mes, con opción para mostrar todos los datos.
- Conteos por cada categoría de `RAZÓN AGRUPADA`, participación porcentual y gráfico de las principales razones.
- Exportación CSV del resumen filtrado.
- Comprobación de los conteos de `RECHAZOS` contra la tabla de validación de `Hoja1`.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub. Si los datos son internos o no deben hacerse públicos, usa un repositorio privado y confirma que el acceso de publicación corresponda a tu política de datos.
2. Sube `index.html`, `styles.css`, `app.js`, `data.json` y `README.md` a la raíz del repositorio. No es necesario subir el Excel original.
3. En GitHub, abre **Settings → Pages**. En *Build and deployment*, selecciona la rama principal y la carpeta raíz (`/root` o `/(root)`, según la interfaz) y guarda.
4. GitHub mostrará la URL publicada en la misma sección. Comparte esa dirección con las personas autorizadas.

El dashboard usa rutas relativas, así que también funciona si el repositorio se publica bajo una URL de proyecto.

## Cómo actualizar el dashboard cuando llegue otro mes

Coloca el Excel actualizado junto a `build_data.py` y ejecuta:

```bash
python build_data.py RECHAZOS_CRUCE_BPI_AGENCIA.xlsx data.json
```

Después, sube el `data.json` regenerado al repositorio. Las tarjetas, los filtros y las categorías se arman de manera dinámica a partir de los datos agregados; los meses nuevos se incorporan automáticamente.

El script solo exporta conteos agrupados por mes, archivo de origen, región, determinante y razón. No exporta nombres, folios ni datos de ejecutivos. **No subas el Excel original a un repositorio público**: contiene información a nivel de registro que no necesita mostrarse en este dashboard.

## Desarrollo local

Como la página carga `data.json` mediante `fetch`, evita abrir `index.html` con doble clic (`file://`). Ejecuta desde esta carpeta:

```bash
python -m http.server 8000
```

Después abre `http://localhost:8000` en el navegador.

## Validación inicial

El recuento por `ARCHIVO ORIGEN` se compara con la tabla de resumen que existe en `Hoja1`. El dashboard muestra el estado de esa validación en la cabecera y el pie de página.
