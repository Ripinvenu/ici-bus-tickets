export type TipoBoleto = 'estudiante' | 'adulto_mayor' | 'menor' | 'adulto';
export type EstadoBoleto = 'activo' | 'usado' | 'cancelado' | 'convertido_libre';

export interface Ruta {
  id: string;
  origen: string;
  destino: string;
  precio: number;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Horario {
  id: string;
  ruta_id: string;
  hora: string;
  dias_semana: number[];
  activo: boolean;
  created_at: string;
}

export interface Corrida {
  id: string;
  ruta_id: string;
  horario_id: string;
  fecha: string;
  hora: string;
  capacidad: number;
  boletos_vendidos: number;
  created_at: string;
  ruta?: Ruta;
}

export interface Boleto {
  id: string;
  folio: string;
  corrida_id: string;
  user_id: string | null;
  nombre_pasajero: string;
  email_pasajero: string;
  tipo_boleto: TipoBoleto;
  precio_pagado: number;
  estado: EstadoBoleto;
  created_at: string;
  updated_at: string;
  corrida?: Corrida;
}

export interface BoletoLibre {
  id: string;
  boleto_original_id: string;
  folio: string;
  valor: number;
  fecha_expiracion: string;
  usado: boolean;
  usado_en_boleto_id: string | null;
  created_at: string;
}

export interface Recompensa {
  id: string;
  nombre: string;
  descripcion: string | null;
  puntos_requeridos: number;
  descuento_porcentaje: number | null;
  descuento_fijo: number | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  nombre: string;
  email: string;
  fecha_nacimiento: string | null;
  puntos_fidelidad: number;
  created_at: string;
  updated_at: string;
}

export interface HistorialPuntos {
  id: string;
  user_id: string;
  boleto_id: string | null;
  puntos: number;
  tipo: 'ganado' | 'canjeado';
  descripcion: string | null;
  created_at: string;
}

export interface RecompensaCanjeada {
  id: string;
  user_id: string;
  recompensa_id: string;
  aplicada: boolean;
  boleto_aplicado_id: string | null;
  created_at: string;
  aplicada_at: string | null;
  recompensa?: Recompensa;
}

export interface RutaConHorarios extends Ruta {
  horarios: Horario[];
}

export interface CorridaConDetalles extends Corrida {
  ruta: Ruta;
  horario: Horario;
  disponibles: number;
}

export const PRECIOS_TIPO_BOLETO: Record<TipoBoleto, number> = {
  adulto: 1.0,
  estudiante: 0.5,
  adulto_mayor: 0.5,
  menor: 0.0,
};

export const LABELS_TIPO_BOLETO: Record<TipoBoleto, string> = {
  adulto: 'Adulto',
  estudiante: 'Estudiante (50% desc.)',
  adulto_mayor: 'Adulto Mayor (50% desc.)',
  menor: 'Menor (Gratis)',
};
