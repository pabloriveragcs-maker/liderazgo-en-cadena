# 🔗 LIDERAZGO EN CADENA — "Nadie gana solo."

Aplicación web para la actividad universitaria de Liderazgo. Funciona en celulares (Android/iPhone), tabletas y computadoras. Sincronización en tiempo real con **Firebase Realtime Database** (plan gratuito).

## B. Estructura de archivos

```
liderazgo-en-cadena/
├── index.html          ← página (carga Firebase, el generador de QR y los scripts)
├── style.css           ← diseño
├── script.js           ← toda la lógica (retos, turnos, cronómetro, ranking, organizador)
├── firebase-config.js  ← AQUÍ pegas tus credenciales y ajustes (contraseña, tiempo, etc.)
└── README.md           ← estas instrucciones
```

## C. Instalación (paso a paso)

1. **Crear la carpeta:** en tu computadora crea una carpeta llamada `liderazgo-en-cadena`.
2. **Guardar los archivos:** coloca dentro los 4 archivos (`index.html`, `style.css`, `script.js`, `firebase-config.js`). Deben estar juntos, en la misma carpeta.
3. **Abrir el proyecto:** haz doble clic en `index.html` (se abre en Chrome/Edge/Safari).
4. **Probar en la computadora (sin Firebase):** si no has configurado Firebase verás la etiqueta amarilla *"MODO PRUEBA LOCAL"*. Abre `index.html` en **varias pestañas del mismo navegador**: cada pestaña es un jugador distinto. En una pestaña pulsa **SOY ORGANIZADOR** (contraseña inicial: `liderazgo2026`). Sirve para ver todo el flujo, pero **no funciona entre celulares distintos**; para eso necesitas el paso D.

## D. Configuración de Firebase (gratis)

1. Entra a <https://console.firebase.google.com> con una cuenta de Google → **Agregar proyecto** → ponle un nombre (ej. `liderazgo-cadena`) → puedes desactivar Google Analytics → **Crear**.
2. **Crear la base de datos:** menú izquierdo **Compilación → Realtime Database → Crear base de datos** → elige la ubicación más cercana → selecciona **Modo de prueba** → **Habilitar**.
3. **Reglas:** pestaña **Reglas**, borra lo que hay y pega esto, luego **Publicar**:
   ```json
   {
     "rules": {
       "game":     { ".read": true, ".write": true },
       "presence": { ".read": true, ".write": true }
     }
   }
   ```
   (Seguridad básica, suficiente para una actividad de clase. No guardes datos sensibles.)
4. **Obtener credenciales:** ⚙️ **Configuración del proyecto → General → Tus apps → icono `</>` (Web)** → registra la app con cualquier nombre (no necesitas Hosting) → copia el objeto `firebaseConfig`.
5. **Pegar credenciales:** abre `firebase-config.js` con el Bloc de notas y reemplaza los valores `PEGA_AQUI` dentro de `firebase: { ... }`. **Muy importante:** debe incluir `databaseURL` (aparece en la pestaña **Datos** de Realtime Database, tipo `https://tu-proyecto-default-rtdb.firebaseio.com`; si no sale en el `firebaseConfig`, agrégala tú).
6. En el mismo archivo **cambia `organizerPassword`** por una contraseña tuya. Ahí también puedes ajustar equipos (10), máximo de integrantes (6), minutos (15) y si los compañeros ven el reto (`showChallengeToTeammates`).
7. Guarda y recarga: la etiqueta amarilla de modo local debe desaparecer.

## E. Publicar gratis (para obtener un enlace)

**Opción más fácil — Netlify Drop**
1. Entra a <https://app.netlify.com/drop> (crea cuenta gratis).
2. Arrastra la **carpeta completa** `liderazgo-en-cadena` a la zona indicada.
3. En segundos te da un enlace tipo `https://nombre-aleatorio.netlify.app`. Ese es el **enlace público**. (Puedes cambiar el nombre en *Site settings → Change site name*.)

**Alternativa — GitHub Pages:** crea un repositorio público, sube los 4 archivos, *Settings → Pages → Deploy from branch → main / root*. El enlace será `https://tu-usuario.github.io/tu-repo/`.

Cada vez que cambies `firebase-config.js` (por ejemplo la contraseña) vuelve a subir la carpeta.

## F. Generar el QR

1. Abre **tu enlace público** en una computadora → **SOY ORGANIZADOR** → contraseña.
2. Pestaña **📱 Código QR**: el QR ya apunta al enlace de la página. Si el enlace mostrado no es el público, pégalo en el campo y pulsa **ACTUALIZAR QR**.
3. Usa **⛶ Pantalla completa** y proyéctalo para que los estudiantes lo escaneen con la cámara.

## G. Prueba con varios celulares (hazla antes de la clase)

1. Con Firebase ya configurado y la página publicada, abre el enlace en **2 o 3 celulares** (puedes usar datos móviles o Wi‑Fi).
2. Celular A: nombre → Equipo 1. Celular B: nombre → Equipo 1. Verifica que en la **sala de espera** se vean ambos en tiempo real con 🟢.
3. En la computadora entra como organizador: verifica que aparecen en el panel. Pulsa **INICIAR ACTIVIDAD → INICIAR**.
4. Tras la cuenta regresiva, solo el Jugador 1 ve el reto y el campo de respuesta; el Jugador 2 ve *⏳ ESPERANDO*. Prueba una respuesta incorrecta (el turno no cambia) y luego la correcta (pasa al Jugador 2).
5. Completa los 12 retos: verás la pantalla 🎉 y la clasificación. Prueba **FINALIZAR** y **REINICIAR ACTIVIDAD**.
6. **Antes de la clase pulsa REINICIAR** para dejar todo limpio.

Respuestas para tu prueba: 1 empatía · 2 liderazgo · 3 equipo · 4 confianza · 5 unidad · 6 comunicación · 7 Colaboración (botón) · 8 Creatividad / Cooperación / Honestidad (en ese orden de definiciones) · 9 respeto · 10 escucha · 11 motivación · 12 nadie gana solo.

## H. Cómo funcionan los turnos

- Cada persona recibe su **número de jugador** (1 a 6) por orden de ingreso. El máximo es 6 por equipo.
- La cantidad de integrantes **n** se toma de quienes se unieron al equipo antes de iniciar.
- El reto número `r` (1 a 12) lo resuelve el jugador `((r − 1) mod n) + 1`. Con 3 integrantes: 1‑2‑3‑1‑2‑3…; con 6: 1‑2‑3‑4‑5‑6‑1…
- **Bloqueo real:** al enviar una respuesta correcta, el servidor (transacción de Firebase) comprueba que quien responde sea el jugador con turno y que el progreso no haya cambiado. Si no, la respuesta se descarta. Solo así avanza el progreso y se habilita al siguiente.
- Una respuesta incorrecta no cambia nada: el turno sigue siendo del mismo jugador.
- Las respuestas se comparan sin tildes, mayúsculas, espacios ni signos.

## I. Cómo funciona la clasificación

1. **Primer criterio:** más retos completados (12/12 siempre queda sobre 11/12).
2. **Segundo criterio:** menor tiempo. Para equipos que terminaron es su tiempo total; para los que no, el tiempo en que lograron su último reto (si no avanzaron, quedan al final). Persistente empate final: número de equipo.
3. El cronómetro de cada equipo parte del inicio (tras la cuenta regresiva de 5 s) y se detiene al completar el reto 12. A los 15:00 se marca **⏰ TIEMPO AGOTADO** y se conserva el progreso.
4. Los **Resultados finales** aparecen automáticamente cuando todos los equipos terminan o se agota el tiempo, o cuando el organizador pulsa **FINALIZAR**.

## Notas útiles

- Si a un estudiante se le cierra la página, al reabrirla el mismo celular **recupera su lugar** (se guarda en el navegador).
- Si alguien se une por error a otro equipo, puede usar **Salir del equipo / cambiar** en la sala de espera (antes de iniciar).
- Las respuestas correctas están dentro de `script.js` (un estudiante técnico podría verlas). Es adecuado para una dinámica de clase; para algo más estricto habría que moverlas a un servidor.
- Si un celular se queda sin batería a mitad del juego, el equipo no podrá avanzar cuando le toque a esa persona: pídele que vuelva a abrir el enlace desde el mismo celular.
