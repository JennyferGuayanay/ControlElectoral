export const almacenSesion = {
  getItem(nombre: string) {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(nombre);
  },
  setItem(nombre: string, valor: string) {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(nombre, valor);
  },
  removeItem(nombre: string) {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(nombre);
  },
};
