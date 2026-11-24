export function codificarUtf8(texto: string): Uint8Array {
  const bytes = encodeURIComponent(texto).replace(/%([0-9A-F]{2})/g, (_parte, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  );
  return Uint8Array.from(bytes, (caracter) => caracter.charCodeAt(0));
}
