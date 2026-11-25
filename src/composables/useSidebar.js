import { ref } from 'vue';

/**
 * Estado compartido del menú lateral.
 *
 * - abierto: en celulares y tabletas el menú se oculta; indica si el
 *   usuario lo abrió con el botón ☰ de la barra superior.
 * - contraido: en pantallas grandes el menú puede reducirse a solo
 *   íconos. La elección se recuerda en este navegador.
 */
const CLAVE = 'menuLateralContraido';

const leerPreferencia = () => {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false; // navegación privada o almacenamiento bloqueado
  }
};

const abierto = ref(false);
const contraido = ref(leerPreferencia());

export function useSidebar() {
  const alternar = () => {
    abierto.value = !abierto.value;
  };

  const cerrar = () => {
    abierto.value = false;
  };

  const alternarContraido = () => {
    contraido.value = !contraido.value;
    try {
      localStorage.setItem(CLAVE, contraido.value ? '1' : '0');
    } catch {
      // si no se puede guardar, solo dura hasta recargar la página
    }
  };

  return { abierto, alternar, cerrar, contraido, alternarContraido };
}
