export const PANEL_THEME_STORAGE_KEY = "epicshine-panel-theme";

/**
 * Se inyecta como <script> al principio de los layouts de admin y POS
 * para aplicar el tema guardado antes del primer pintado — sin esto, la
 * pantalla arranca siempre oscura (el valor por defecto de globals.css) y
 * pega un salto visual al tema claro recién cuando React hidrata.
 */
export const PANEL_THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  PANEL_THEME_STORAGE_KEY
)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
