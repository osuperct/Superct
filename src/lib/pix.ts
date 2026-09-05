/** Geração de código Pix estático (BR Code / copia e cola). */

export const PIX_CHAVE = "+5535988223596";
export const PIX_CHAVE_EXIBICAO = "35 98822-3596";
const PIX_NOME = "SUPER CT";
const PIX_CIDADE = "S SEBASTIAO PARAISO";

function campo(id: string, valor: string) {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Monta o código Pix copia e cola para um valor e uma descrição curta. */
export function gerarPix(valor: number, referencia = "SUPERCT") {
  const ref = referencia
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 20)
    .toUpperCase() || "SUPERCT";

  const conta = campo("00", "br.gov.bcb.pix") + campo("01", PIX_CHAVE);
  const semCrc =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", valor.toFixed(2)) +
    campo("58", "BR") +
    campo("59", PIX_NOME.slice(0, 25)) +
    campo("60", PIX_CIDADE.slice(0, 15)) +
    campo("62", campo("05", ref)) +
    "6304";
  return semCrc + crc16(semCrc);
}
