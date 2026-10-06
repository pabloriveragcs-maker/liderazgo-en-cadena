/* ============================================================
   LIDERAZGO EN CADENA — CONFIGURACIÓN
   ============================================================
   1) Pega aquí las credenciales de tu proyecto de Firebase
      (Configuración del proyecto > Tus apps > Configuración de SDK).
      IMPORTANTE: debe incluir "databaseURL".

   2) Si dejas "PEGA_AQUI" la app funciona en MODO PRUEBA LOCAL
      (solo sirve para probar en una computadora con varias pestañas
      del mismo navegador; NO sirve para celulares distintos).
   ============================================================ */

window.LEC_CONFIG = {

      firebase: {
     apiKey: "...",
     authDomain: "liderazgo-cadena.firebaseapp.com",
     databaseURL: "https://liderazgo-cadena-default-rtdb.firebaseio.com",
     projectId: "liderazgo-cadena",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   },
  // Contraseña para entrar como organizador (cámbiala antes de la actividad)
  organizerPassword: "liderazgo2026",

  // Ajustes de la actividad
  teamsCount: 10,            // cantidad de equipos
  maxPlayers: 6,             // máximo de integrantes por equipo
  minPlayers: 2,             // mínimo recomendado (solo genera una advertencia)
  timeLimitMinutes: 15,      // tiempo máximo de la actividad
  countdownSeconds: 5,       // cuenta regresiva antes de empezar

  // false = solo el jugador con turno ve el reto (los demás deben comunicarse).
  // true  = los compañeros también ven el reto (solo lectura).
  showChallengeToTeammates: false
};
