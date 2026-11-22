/* Pegue aquí la URL de su implementación de Apps Script (termina en /exec).
   Si se deja vacía, la página funciona en MODO DEMO (datos solo en este navegador). */
window.API_URL = 'https://script.google.com/macros/s/AKfycbyH1SWH1W2CVqH5uOzKuVbOCA_XaTsodzZtflbS5YQAPUX_-Vh2C5io13yK1hV5bo91/exec';

/* Imágenes por defecto de la licencia (se usan si no se sube otra en "Datos del colegio").
   Se incrustan en el PDF con su resolución original, sin recomprimir. */
/* Nombre que aparece en la portada */
window.COLEGIO_NOMBRE = 'Colegio Marina de Chile';

/* Dominio del correo institucional: al crear un usuario solo se escribe lo que va antes de la @ */
window.DOMINIO_CORREO = 'andaliensur.cl';

/* Ingreso con Google: pegue aquí el "ID de cliente" de OAuth (termina en .apps.googleusercontent.com).
   Debe ser el MISMO que GOOGLE_CLIENT_ID en Code.gs. Vacío = solo ingreso con usuario y clave. */
window.GOOGLE_CLIENT_ID = '197883899587-30tmp2umaf7166b90qjnva7dc5eoa4fv.apps.googleusercontent.com';

window.LICENCIA_ASSETS = {
  escudo: 'escudo-chile.png',   // Escudo de la República de Chile (centro) — FIJO, no se puede cambiar
  colegio: 'logo-70-anios.png', // Insignia por defecto (izquierda y marca de agua central)
  // Insignias que se pueden elegir en "Datos del colegio" (además de subir otra)
  insignias: [
    { id: '70', nombre: 'Logo 70 años', src: 'logo-70-anios.png' },
    { id: 'color', nombre: 'Insignia a color', src: 'insignia-color.jpg' },
    { id: 'blanca', nombre: 'Insignia fondo blanco', src: 'logo-colegio.png' }
  ]
};
