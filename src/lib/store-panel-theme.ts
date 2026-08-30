export const STORE_THEME_TOGGLE_KEY = "epicshine-store-theme";

/**
 * Se inyecta como <script> justo después del contenedor de la tienda para
 * aplicar el modo guardado (claro/oscuro) antes del primer pintado — sin
 * esto, la tienda siempre arranca en el modo por defecto (oscuro) y pega un
 * salto visual al modo guardado recién cuando React hidrata. Independiente
 * del theme-toggle de admin/POS: usa su propia clave y solo afecta al
 * contenedor de la tienda (#store-root), nunca a <html>.
 */
export const STORE_THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORE_THEME_TOGGLE_KEY
)});if(t==="light"){var el=document.getElementById("store-root");if(el)el.setAttribute("data-theme","light");}}catch(e){}})();`;
