/**
 * Se importa antes que cualquier función: firebase-functions calcula la configuración de cada
 * función al definirla, así que las opciones globales tienen que estar puestas desde el principio.
 */
import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();

// La base de datos está en nam5 (Estados Unidos): las funciones quedan en la misma zona.
// Tope de instancias: evita sorpresas en la factura si alguien abusa de las funciones.
// invoker 'public' (solo aplica a las funciones HTTP): las callable y el webhook deben poder llamarse
// desde internet; cada una valida por dentro la sesión o la firma.
setGlobalOptions({ region: 'us-central1', maxInstances: 5, invoker: 'public' });
