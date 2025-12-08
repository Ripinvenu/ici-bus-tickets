import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, User, Mail, Ticket, CreditCard, Check, Loader2, ArrowRight, RefreshCw, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Ruta, Horario, TipoBoleto, PRECIOS_TIPO_BOLETO, LABELS_TIPO_BOLETO } from '@/types/database';
import { PaymentCardForm } from '@/components/PaymentCardForm';
import { z } from 'zod';

const pasajeroSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido').max(255),
});

type Step = 'ruta' | 'horario' | 'pasajero' | 'pago' | 'confirmacion';

interface BoletoLibre {
  id: string;
  folio: string;
  valor: number;
  fecha_expiracion: string;
  usado: boolean;
}

interface RecompensaCanjeada {
  id: string;
  recompensa_id: string;
  recompensa: {
    id: string;
    nombre: string;
    descripcion: string | null;
    descuento_porcentaje: number | null;
    descuento_fijo: number | null;
  };
}

export default function Comprar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState<Step>('ruta');
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Form state
  const [selectedRuta, setSelectedRuta] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedHorario, setSelectedHorario] = useState<string>('');
  const [tipoBoleto, setTipoBoleto] = useState<TipoBoleto>('adulto');
  const [pasajero, setPasajero] = useState({ nombre: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCardValid, setIsCardValid] = useState(false);

  // Free ticket state
  const [boletoLibre, setBoletoLibre] = useState<BoletoLibre | null>(null);
  const [diferenciaPagar, setDiferenciaPagar] = useState(0);

  // Rewards state
  const [recompensasDisponibles, setRecompensasDisponibles] = useState<RecompensaCanjeada[]>([]);
  const [recompensaSeleccionada, setRecompensaSeleccionada] = useState<RecompensaCanjeada | null>(null);

  // Result
  const [folio, setFolio] = useState<string>('');
  const [disponibles, setDisponibles] = useState<number | null>(null);

  useEffect(() => {
    fetchRutas();
    const rutaParam = searchParams.get('ruta');
    if (rutaParam) {
      setSelectedRuta(rutaParam);
    }
    
    // Check for free ticket redemption
    const libreParam = searchParams.get('libre');
    console.log('Parámetro libre en URL:', libreParam);
    if (libreParam) {
      fetchBoletoLibre(libreParam);
    }
  }, [searchParams]);

  // Fetch user's available rewards
  useEffect(() => {
    if (user) {
      fetchRecompensasDisponibles();
    }
  }, [user]);

  const fetchRecompensasDisponibles = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('recompensas_canjeadas')
      .select(`
        id,
        recompensa_id,
        recompensa:recompensas (
          id,
          nombre,
          descripcion,
          descuento_porcentaje,
          descuento_fijo
        )
      `)
      .eq('user_id', user.id)
      .eq('aplicada', false);

    if (!error && data) {
      // Transform the data to match our interface
      const transformed = data.map(item => ({
        id: item.id,
        recompensa_id: item.recompensa_id,
        recompensa: item.recompensa as unknown as RecompensaCanjeada['recompensa']
      })).filter(item => item.recompensa !== null);
      setRecompensasDisponibles(transformed);
    }
  };

  const fetchBoletoLibre = async (id: string) => {
    console.log('Buscando boleto libre con ID:', id);
    
    const { data, error } = await supabase
      .from('boletos_libres')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    console.log('Resultado búsqueda boleto libre:', { data, error });

    if (error || !data) {
      console.error('Error fetching boleto libre:', error, 'ID buscado:', id);
      toast.error('No se encontró el boleto libre');
      navigate('/comprar');
      return;
    }

    if (data.usado) {
      toast.error('Este boleto libre ya fue utilizado');
      navigate('/comprar');
      return;
    }

    if (new Date(data.fecha_expiracion) < new Date()) {
      toast.error('Este boleto libre ha expirado');
      navigate('/comprar');
      return;
    }

    setBoletoLibre({
      ...data,
      valor: Number(data.valor)
    });
  };

  useEffect(() => {
    if (selectedRuta) {
      fetchHorarios(selectedRuta);
    }
  }, [selectedRuta]);

  useEffect(() => {
    if (selectedRuta && selectedDate && selectedHorario) {
      checkDisponibilidad();
    }
  }, [selectedRuta, selectedDate, selectedHorario]);

  const fetchRutas = async () => {
    const { data, error } = await supabase
      .from('rutas')
      .select('*')
      .eq('activa', true)
      .order('origen');

    if (!error && data) {
      setRutas(data.map(r => ({ ...r, precio: Number(r.precio) })));
    }
    setIsLoading(false);
  };

  const fetchHorarios = async (rutaId: string) => {
    const { data, error } = await supabase
      .from('horarios')
      .select('*')
      .eq('ruta_id', rutaId)
      .eq('activo', true)
      .order('hora');

    if (!error && data) {
      setHorarios(data);
    }
  };

  const checkDisponibilidad = async () => {
    // First, check if corrida exists for this date/horario
    const { data: corrida, error } = await supabase
      .from('corridas')
      .select('*')
      .eq('horario_id', selectedHorario)
      .eq('fecha', selectedDate)
      .maybeSingle();

    if (error) {
      console.error('Error checking disponibilidad:', error);
      return;
    }

    if (corrida) {
      setDisponibles(corrida.capacidad - corrida.boletos_vendidos);
    } else {
      setDisponibles(40); // New corrida would have 40 seats
    }
  };

  const getRutaSeleccionada = () => rutas.find(r => r.id === selectedRuta);

  const calcularPrecio = () => {
    const ruta = getRutaSeleccionada();
    if (!ruta) return 0;
    return ruta.precio * PRECIOS_TIPO_BOLETO[tipoBoleto];
  };

  const calcularPrecioAPagar = () => {
    let precioTotal = calcularPrecio();
    
    // Apply reward discount first (only 1 reward per ticket)
    if (recompensaSeleccionada) {
      const { recompensa } = recompensaSeleccionada;
      if (recompensa.descuento_porcentaje) {
        precioTotal = precioTotal * (1 - recompensa.descuento_porcentaje / 100);
      } else if (recompensa.descuento_fijo) {
        precioTotal = precioTotal - recompensa.descuento_fijo;
      }
    }
    
    // Then apply free ticket value
    if (boletoLibre) {
      precioTotal = precioTotal - boletoLibre.valor;
    }
    
    return Math.max(0, precioTotal);
  };

  const calcularDescuentoRecompensa = () => {
    if (!recompensaSeleccionada) return 0;
    const precioBase = calcularPrecio();
    const { recompensa } = recompensaSeleccionada;
    if (recompensa.descuento_porcentaje) {
      return precioBase * (recompensa.descuento_porcentaje / 100);
    } else if (recompensa.descuento_fijo) {
      return Math.min(recompensa.descuento_fijo, precioBase);
    }
    return 0;
  };

  // Update diferencia when ruta or tipo changes
  useEffect(() => {
    if (boletoLibre && selectedRuta) {
      const precioTotal = calcularPrecio();
      const diferencia = precioTotal - boletoLibre.valor;
      setDiferenciaPagar(diferencia > 0 ? diferencia : 0);
    }
  }, [selectedRuta, tipoBoleto, boletoLibre]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const handleContinueToHorario = () => {
    if (!selectedRuta) {
      toast.error('Selecciona una ruta');
      return;
    }
    setStep('horario');
  };

  const handleContinueToPasajero = () => {
    if (!selectedDate) {
      toast.error('Selecciona una fecha');
      return;
    }
    if (!selectedHorario) {
      toast.error('Selecciona un horario');
      return;
    }
    if (disponibles !== null && disponibles <= 0) {
      toast.error('No hay lugares disponibles para esta corrida');
      return;
    }
    setStep('pasajero');
  };

  const handleContinueToPago = () => {
    setErrors({});
    const result = pasajeroSchema.safeParse(pasajero);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setStep('pago');
  };

  const handleComprar = async () => {
    setIsPurchasing(true);

    try {
      // 1. Get or create corrida
      let corridaId: string;
      const horario = horarios.find(h => h.id === selectedHorario);
      
      const { data: existingCorrida } = await supabase
        .from('corridas')
        .select('*')
        .eq('horario_id', selectedHorario)
        .eq('fecha', selectedDate)
        .maybeSingle();

      if (existingCorrida) {
        if (existingCorrida.boletos_vendidos >= existingCorrida.capacidad) {
          toast.error('Ya no hay lugares disponibles');
          setIsPurchasing(false);
          return;
        }
        corridaId = existingCorrida.id;
      } else {
        const { data: newCorrida, error: corridaError } = await supabase
          .from('corridas')
          .insert({
            ruta_id: selectedRuta,
            horario_id: selectedHorario,
            fecha: selectedDate,
            hora: horario?.hora || '00:00',
            capacidad: 40,
            boletos_vendidos: 0,
          })
          .select()
          .single();

        if (corridaError || !newCorrida) {
          throw new Error('Error al crear la corrida');
        }
        corridaId = newCorrida.id;
      }

      // 2. Generate folio
      const { data: folioData, error: folioError } = await supabase.rpc('generate_folio');
      if (folioError || !folioData) {
        throw new Error('Error al generar folio');
      }

      // 3. Create boleto - use the actual paid price
      const precioPagado = calcularPrecioAPagar();
      const { data: boleto, error: boletoError } = await supabase
        .from('boletos')
        .insert({
          folio: folioData,
          corrida_id: corridaId,
          user_id: user?.id || null,
          nombre_pasajero: pasajero.nombre,
          email_pasajero: pasajero.email,
          tipo_boleto: tipoBoleto,
          precio_pagado: precioPagado,
          estado: 'activo',
        })
        .select()
        .single();

      if (boletoError || !boleto) {
        throw new Error('Error al crear el boleto');
      }

      // 4. Update corrida boletos_vendidos
      await supabase
        .from('corridas')
        .update({ boletos_vendidos: (existingCorrida?.boletos_vendidos || 0) + 1 })
        .eq('id', corridaId);

      // 5. If using a free ticket, mark it as used
      if (boletoLibre) {
        await supabase
          .from('boletos_libres')
          .update({ 
            usado: true, 
            usado_en_boleto_id: boleto.id 
          })
          .eq('id', boletoLibre.id);
      }

      // 6. If using a reward, mark it as applied
      if (recompensaSeleccionada) {
        await supabase
          .from('recompensas_canjeadas')
          .update({ 
            aplicada: true, 
            aplicada_at: new Date().toISOString(),
            boleto_aplicado_id: boleto.id 
          })
          .eq('id', recompensaSeleccionada.id);
      }

      // 7. If user is logged in, add loyalty points (only for paid purchases, not free ticket redemptions)
      if (user && !boletoLibre && !recompensaSeleccionada) {
        await supabase.from('historial_puntos').insert({
          user_id: user.id,
          boleto_id: boleto.id,
          puntos: 1,
          tipo: 'ganado',
          descripcion: `Compra de boleto ${folioData}`,
        });

        await supabase
          .from('profiles')
          .update({ puntos_fidelidad: (await supabase.from('profiles').select('puntos_fidelidad').eq('id', user.id).single()).data?.puntos_fidelidad + 1 || 1 })
          .eq('id', user.id);
      }

      setFolio(folioData);
      setStep('confirmacion');
      toast.success(boletoLibre ? '¡Boleto libre canjeado exitosamente!' : '¡Boleto comprado exitosamente!');
    } catch (error) {
      console.error('Error purchasing:', error);
      toast.error('Error al procesar la compra. Intenta de nuevo.');
    }

    setIsPurchasing(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="bg-gradient-hero py-12">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl font-bold text-primary-foreground text-center mb-2">
            {boletoLibre ? 'Canjear Boleto Libre' : 'Comprar Boletos'}
          </h1>
          <p className="text-primary-foreground/80 text-center">
            {boletoLibre ? `Usando boleto libre: ${boletoLibre.folio}` : 'Sin necesidad de crear cuenta'}
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {(['ruta', 'horario', 'pasajero', 'pago', 'confirmacion'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s ? 'bg-primary text-primary-foreground' :
                  (['ruta', 'horario', 'pasajero', 'pago', 'confirmacion'].indexOf(step) > i) 
                    ? 'bg-success text-success-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {(['ruta', 'horario', 'pasajero', 'pago', 'confirmacion'].indexOf(step) > i) ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 4 && <div className="w-8 h-0.5 bg-muted mx-1" />}
              </div>
            ))}
          </div>

          <div className="card-elevated p-6">
            {/* Step 1: Select Route */}
            {step === 'ruta' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold">Selecciona tu Ruta</h2>
                    <p className="text-sm text-muted-foreground">Elige origen y destino</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Ruta</Label>
                    <Select value={selectedRuta} onValueChange={setSelectedRuta}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecciona una ruta" />
                      </SelectTrigger>
                      <SelectContent>
                        {rutas.map((ruta) => (
                          <SelectItem key={ruta.id} value={ruta.id}>
                            {ruta.origen} → {ruta.destino} - ${ruta.precio.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tipo de Boleto</Label>
                    <Select value={tipoBoleto} onValueChange={(v) => setTipoBoleto(v as TipoBoleto)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(LABELS_TIPO_BOLETO) as TipoBoleto[]).map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {LABELS_TIPO_BOLETO[tipo]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRuta && (
                    <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Precio del boleto:</span>
                        <span className="text-lg font-bold text-primary">${calcularPrecio().toFixed(2)}</span>
                      </div>
                      {recompensaSeleccionada && (
                        <div className="flex justify-between text-success">
                          <span className="text-sm">Recompensa aplicada:</span>
                          <span className="text-lg font-medium">-${calcularDescuentoRecompensa().toFixed(2)}</span>
                        </div>
                      )}
                      {boletoLibre && (
                        <div className="flex justify-between text-success">
                          <span className="text-sm">Valor del boleto libre:</span>
                          <span className="text-lg font-medium">-${boletoLibre.valor.toFixed(2)}</span>
                        </div>
                      )}
                      {(boletoLibre || recompensaSeleccionada) && (
                        <>
                          <div className="border-t border-border pt-2 flex justify-between">
                            <span className="text-sm font-medium">A pagar:</span>
                            <span className="text-xl font-bold text-primary">
                              ${calcularPrecioAPagar().toFixed(2)}
                            </span>
                          </div>
                          {calcularPrecioAPagar() === 0 && (
                            <p className="text-sm text-success">¡No necesitas pagar nada adicional!</p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Reward Selection - Only show if user has rewards and not using free ticket */}
                  {user && recompensasDisponibles.length > 0 && !boletoLibre && (
                    <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-accent" />
                        <span className="font-medium text-accent-foreground">Aplicar Recompensa (solo 1 por boleto)</span>
                      </div>
                      <div className="space-y-2">
                        {recompensasDisponibles.map((rc) => (
                          <button
                            key={rc.id}
                            type="button"
                            onClick={() => setRecompensaSeleccionada(recompensaSeleccionada?.id === rc.id ? null : rc)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                              recompensaSeleccionada?.id === rc.id
                                ? 'border-accent bg-accent/20'
                                : 'border-border hover:border-accent/50'
                            }`}
                          >
                            <div className="font-medium">{rc.recompensa.nombre}</div>
                            <div className="text-sm text-muted-foreground">
                              {rc.recompensa.descuento_porcentaje 
                                ? `${rc.recompensa.descuento_porcentaje}% de descuento` 
                                : `$${rc.recompensa.descuento_fijo?.toFixed(2)} de descuento`}
                            </div>
                          </button>
                        ))}
                      </div>
                      {recompensaSeleccionada && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setRecompensaSeleccionada(null)}
                          className="text-muted-foreground"
                        >
                          Quitar recompensa
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <Button onClick={handleContinueToHorario} className="w-full" disabled={!selectedRuta}>
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Select Date & Schedule */}
            {step === 'horario' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold">Fecha y Horario</h2>
                    <p className="text-sm text-muted-foreground">Elige cuándo viajar</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Fecha de Viaje</Label>
                    <Input
                      type="date"
                      min={getMinDate()}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {selectedDate && horarios.length > 0 && (
                    <div>
                      <Label>Horario</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {horarios.map((horario) => (
                          <button
                            key={horario.id}
                            onClick={() => setSelectedHorario(horario.id)}
                            className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                              selectedHorario === horario.id
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Clock className="h-4 w-4" />
                            {formatTime(horario.hora)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {disponibles !== null && (
                    <div className={`p-4 rounded-lg ${disponibles > 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      <p className="font-medium">
                        {disponibles > 0 
                          ? `${disponibles} lugares disponibles`
                          : 'Sin lugares disponibles'
                        }
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('ruta')} className="flex-1">
                    Atrás
                  </Button>
                  <Button onClick={handleContinueToPasajero} className="flex-1" disabled={!selectedDate || !selectedHorario || disponibles === 0}>
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Passenger Info */}
            {step === 'pasajero' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold">Datos del Pasajero</h2>
                    <p className="text-sm text-muted-foreground">Información para el boleto</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre Completo</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="nombre"
                        placeholder="Juan Pérez"
                        className="pl-10"
                        value={pasajero.nombre}
                        onChange={(e) => setPasajero({ ...pasajero, nombre: e.target.value })}
                      />
                    </div>
                    {errors.nombre && <p className="text-sm text-destructive mt-1">{errors.nombre}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        className="pl-10"
                        value={pasajero.email}
                        onChange={(e) => setPasajero({ ...pasajero, email: e.target.value })}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('horario')} className="flex-1">
                    Atrás
                  </Button>
                  <Button onClick={handleContinueToPago} className="flex-1">
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Payment */}
            {step === 'pago' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      {boletoLibre && calcularPrecioAPagar() === 0 ? 'Confirmar Canje' : 'Datos de Pago'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {boletoLibre && calcularPrecioAPagar() === 0 
                        ? 'Confirma los detalles de tu viaje' 
                        : 'Ingresa los datos de tu tarjeta'}
                    </p>
                  </div>
                </div>

                {/* Payment Card Form - Only show if there's something to pay */}
                {calcularPrecioAPagar() > 0 && (
                  <PaymentCardForm onValidChange={setIsCardValid} />
                )}

                {/* Free ticket info */}
                {boletoLibre && (
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="h-4 w-4 text-accent" />
                      <span className="font-medium text-accent-foreground">Boleto Libre</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Folio: <span className="font-mono">{boletoLibre.folio}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Valor: ${boletoLibre.valor.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Reward info */}
                {recompensaSeleccionada && (
                  <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-4 w-4 text-success" />
                      <span className="font-medium text-success">Recompensa Aplicada</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {recompensaSeleccionada.recompensa.nombre}
                    </p>
                    <p className="text-sm text-success">
                      Descuento: ${calcularDescuentoRecompensa().toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ruta</span>
                    <span className="font-medium">{getRutaSeleccionada()?.origen} → {getRutaSeleccionada()?.destino}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha</span>
                    <span className="font-medium">{new Date(selectedDate).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horario</span>
                    <span className="font-medium">{formatTime(horarios.find(h => h.id === selectedHorario)?.hora || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pasajero</span>
                    <span className="font-medium">{pasajero.nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-medium">{LABELS_TIPO_BOLETO[tipoBoleto]}</span>
                  </div>
                  {(boletoLibre || recompensaSeleccionada) && (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Precio boleto</span>
                        <span>${calcularPrecio().toFixed(2)}</span>
                      </div>
                      {recompensaSeleccionada && (
                        <div className="flex justify-between text-success">
                          <span>Recompensa aplicada</span>
                          <span>-${calcularDescuentoRecompensa().toFixed(2)}</span>
                        </div>
                      )}
                      {boletoLibre && (
                        <div className="flex justify-between text-success">
                          <span>Boleto libre aplicado</span>
                          <span>-${boletoLibre.valor.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-semibold">Total a Pagar</span>
                    <span className="text-2xl font-bold text-primary">${calcularPrecioAPagar().toFixed(2)}</span>
                  </div>
                </div>

                {!user && !boletoLibre && (
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 text-sm">
                    <p className="text-accent-foreground">
                      💡 <strong>Tip:</strong> Si inicias sesión, acumularás puntos en el programa de fidelidad.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('pasajero')} className="flex-1">
                    Atrás
                  </Button>
                  <Button 
                    onClick={handleComprar} 
                    className="flex-1" 
                    disabled={isPurchasing || (calcularPrecioAPagar() > 0 && !isCardValid)}
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : calcularPrecioAPagar() === 0 ? (
                      <>
                        <Check className="h-4 w-4" />
                        Confirmar Canje
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Pagar ${calcularPrecioAPagar().toFixed(2)}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Confirmation */}
            {step === 'confirmacion' && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <Check className="h-10 w-10 text-success" />
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                    ¡Compra Exitosa!
                  </h2>
                  <p className="text-muted-foreground">
                    Tu boleto ha sido generado correctamente
                  </p>
                </div>

                <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6">
                  <p className="text-sm text-muted-foreground mb-2">Tu folio de boleto:</p>
                  <p className="text-3xl font-mono font-bold text-primary">{folio}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Guarda este folio para consultar o modificar tu boleto
                  </p>
                </div>

                <div className="bg-secondary/30 rounded-lg p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ruta</span>
                    <span>{getRutaSeleccionada()?.origen} → {getRutaSeleccionada()?.destino}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha</span>
                    <span>{new Date(selectedDate).toLocaleDateString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horario</span>
                    <span>{formatTime(horarios.find(h => h.id === selectedHorario)?.hora || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pasajero</span>
                    <span>{pasajero.nombre}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" onClick={() => navigate('/mi-boleto?folio=' + folio)} className="flex-1">
                    <Ticket className="h-4 w-4" />
                    Ver Mi Boleto
                  </Button>
                  <Button onClick={() => navigate('/')} className="flex-1">
                    Volver al Inicio
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
