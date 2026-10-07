// Aquí escribo un tiempo de juego como lo lee una persona: minutos y segundos ("23:04").
export function reloj(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${Math.floor(segundos % 60).toString().padStart(2, '0')}`;
}
