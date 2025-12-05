import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Ticket, MapPin, Calendar, Clock, User, Mail, Edit, RefreshCw, AlertCircle, Loader2, Check, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Boleto, Ruta, Corrida, Horario, TipoBoleto, LABELS_TIPO_BOLETO } from '@/types/database';
import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PaymentCardForm } from '@/components/PaymentCardForm';

interface BoletoCompleto extends Boleto {
  corrida: Corrida & {
    ruta: Ruta;
    horario: Horario;
  };
}

export default function MiBoleto() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [folio, setFolio] = useState(searchParams.get('folio') || '');
  const [boleto, setBoleto] = useState<BoletoCompleto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [boletoLibre, setBoletoLibre] = useState<any>(null);

  // Modification state
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [modifyForm, setModifyForm] = useState({
    nombre: '',
    fecha: '',
    rutaId: '',
    horarioId: '',
  });
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [precioDiferencia, setPrecioDiferencia] = useState(0);
  const [isCardValid, setIsCardValid] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);

  useEffect(() => {
    const folioParam = searchParams.get('folio');
    if (folioParam) {
      setFolio(folioParam);
      buscarBoletoByFolio(folioParam);
    }
  }, [searchParams]);

  const buscarBoleto = async () => {
    if (!folio.trim()) {
      toast.error('Ingresa un folio');
      return;
    }
    navigate(`/mi-boleto?folio=${folio.trim().toUpperCase()}`, { replace: true });
  };

  const buscarBoletoByFolio = async (folioToSearch: string) => {
    setIsLoading(true);
    setBoleto(null);
    setBoletoLibre(null);

    const searchFolio = folioToSearch.trim().toUpperCase();

    // First check for regular ticket
    const { data: boletoData } = await supabase
      .from('boletos')
      .select(`
        *,
        corrida:corridas(
          *,
          ruta:rutas(*),
          horario:horarios(*)
        )
      `)
      .eq('folio', searchFolio)
      .maybeSingle();

    if (boletoData) {
      const processed = {
        ...boletoData,
        precio_pagado: Number(boletoData.precio_pagado),
        corrida: {
          ...boletoData.corrida,
          ruta: {
            ...boletoData.corrida.ruta,
            precio: Number(boletoData.corrida.ruta.precio)
          }
        }
      };
      setBoleto(processed as BoletoCompleto);
      setModifyForm({
        nombre: boletoData.nombre_pasajero,
        fecha: boletoData.corrida.fecha,
        rutaId: boletoData.corrida.ruta_id,
        horarioId: boletoData.corrida.horario_id,
      });
      setIsLoading(false);
      return;
    }

    // Check for free ticket
    const { data: libreData } = await supabase
      .from('boletos_libres')
      .select(`
        *,
        boleto_original:boletos(
          *,
          corrida:corridas(
            *,
            ruta:rutas(*),
            horario:horarios(*)
          )
        )
      `)
      .eq('folio', searchFolio)
      .maybeSingle();

    if (libreData) {
      setBoletoLibre({
        ...libreData,
        valor: Number(libreData.valor)
      });
    } else {
      toast.error('No se encontró ningún boleto con ese folio');
    }

    setIsLoading(false);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const fetchRutas = async () => {
    const { data } = await supabase.from('rutas').select('*').eq('activa', true);
    if (data) setRutas(data.map(r => ({ ...r, precio: Number(r.precio) })));
  };

  const fetchHorarios = async (rutaId: string) => {
    const { data } = await supabase.from('horarios').select('*').eq('ruta_id', rutaId).eq('activo', true);
    if (data) setHorarios(data);
  };

  useEffect(() => {
    if (showModifyDialog) {
      fetchRutas();
    }
  }, [showModifyDialog]);

  useEffect(() => {
    if (modifyForm.rutaId) {
      fetchHorarios(modifyForm.rutaId);
      // Calculate price difference
      const newRuta = rutas.find(r => r.id === modifyForm.rutaId);
      if (newRuta && boleto) {
        const diff = newRuta.precio - boleto.precio_pagado;
        setPrecioDiferencia(diff > 0 ? diff : 0);
      }
    }
  }, [modifyForm.rutaId, rutas, boleto]);

  const handleContinueToPayment = () => {
    if (precioDiferencia > 0) {
      setShowPaymentStep(true);
    } else {
      handleModificar();
    }
  };

  const handleModificar = async () => {
    if (!boleto) return;

    setIsModifying(true);

    try {
      // Get or create new corrida
      let corridaId = boleto.corrida.id;

      if (modifyForm.fecha !== boleto.corrida.fecha || modifyForm.horarioId !== boleto.corrida.horario_id) {
        const horario = horarios.find(h => h.id === modifyForm.horarioId);
        
        const { data: existingCorrida } = await supabase
          .from('corridas')
          .select('*')
          .eq('horario_id', modifyForm.horarioId)
          .eq('fecha', modifyForm.fecha)
          .maybeSingle();

        if (existingCorrida) {
          if (existingCorrida.boletos_vendidos >= existingCorrida.capacidad) {
            toast.error('No hay lugares disponibles para esa corrida');
            setIsModifying(false);
            return;
          }
          corridaId = existingCorrida.id;
        } else {
          const { data: newCorrida, error } = await supabase
            .from('corridas')
            .insert({
              ruta_id: modifyForm.rutaId,
              horario_id: modifyForm.horarioId,
              fecha: modifyForm.fecha,
              hora: horario?.hora || '00:00',
            })
            .select()
            .single();

          if (error || !newCorrida) throw new Error('Error creating corrida');
          corridaId = newCorrida.id;
        }

        // Update old corrida count
        await supabase
          .from('corridas')
          .update({ boletos_vendidos: Math.max(0, boleto.corrida.boletos_vendidos - 1) })
          .eq('id', boleto.corrida.id);

        // Update new corrida count
        await supabase
          .from('corridas')
          .update({ boletos_vendidos: (await supabase.from('corridas').select('boletos_vendidos').eq('id', corridaId).single()).data?.boletos_vendidos + 1 || 1 })
          .eq('id', corridaId);
      }

      // Update boleto
      const newPrice = precioDiferencia > 0 ? boleto.precio_pagado + precioDiferencia : boleto.precio_pagado;
      
      await supabase
        .from('boletos')
        .update({
          nombre_pasajero: modifyForm.nombre,
          corrida_id: corridaId,
          precio_pagado: newPrice,
        })
        .eq('id', boleto.id);

      toast.success('Boleto modificado exitosamente');
      setShowModifyDialog(false);
      setShowPaymentStep(false);
      buscarBoleto();
    } catch (error) {
      console.error(error);
      toast.error('Error al modificar el boleto');
    }

    setIsModifying(false);
  };

  const handleConvertirALibre = async () => {
    if (!boleto) return;

    setIsConverting(true);

    try {
      const nuevoFolio = `LIBRE-${boleto.folio}`;
      const fechaExpiracion = addMonths(new Date(boleto.created_at), 6);

      await supabase.from('boletos_libres').insert({
        boleto_original_id: boleto.id,
        folio: nuevoFolio,
        valor: boleto.precio_pagado,
        fecha_expiracion: fechaExpiracion.toISOString().split('T')[0],
      });

      await supabase
        .from('boletos')
        .update({ estado: 'convertido_libre' })
        .eq('id', boleto.id);

      toast.success('Boleto convertido a boleto libre');
      // Navigate to the new folio URL
      navigate(`/mi-boleto?folio=${nuevoFolio}`, { replace: true });
    } catch (error) {
      console.error(error);
      toast.error('Error al convertir el boleto');
    }

    setIsConverting(false);
  };

  return (
    <Layout>
      <section className="bg-gradient-hero py-12">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl font-bold text-primary-foreground text-center mb-2">
            Consultar Mi Boleto
          </h1>
          <p className="text-primary-foreground/80 text-center">
            Ingresa tu folio para ver los detalles de tu viaje
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Search */}
          <div className="card-elevated p-6 mb-8">
            <Label htmlFor="folio">Folio del Boleto</Label>
            <div className="flex gap-3 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="folio"
                  placeholder="ICI-20241201-XXXXXXXX"
                  className="pl-10"
                  value={folio}
                  onChange={(e) => setFolio(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && buscarBoleto()}
                />
              </div>
              <Button onClick={buscarBoleto} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
              </Button>
            </div>
          </div>

          {/* Regular Ticket */}
          {boleto && (
            <div className="card-elevated overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="bg-gradient-primary p-6 text-primary-foreground">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Ticket className="h-6 w-6" />
                    <span className="font-display text-xl font-bold">Autobuses ICI</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    boleto.estado === 'activo' ? 'bg-success/20 text-success-foreground' :
                    boleto.estado === 'usado' ? 'bg-muted/20 text-muted-foreground' :
                    boleto.estado === 'convertido_libre' ? 'bg-accent/20 text-accent' :
                    'bg-destructive/20 text-destructive'
                  }`}>
                    {boleto.estado === 'activo' ? 'Activo' :
                     boleto.estado === 'usado' ? 'Usado' :
                     boleto.estado === 'convertido_libre' ? 'Convertido a Libre' :
                     'Cancelado'}
                  </span>
                </div>
                <p className="text-sm opacity-80">Folio:</p>
                <p className="font-mono text-lg font-bold">{boleto.folio}</p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <MapPin className="h-4 w-4" />
                      Origen
                    </div>
                    <p className="font-semibold text-lg">{boleto.corrida.ruta.origen}</p>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="flex-1 text-right">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 justify-end">
                      <MapPin className="h-4 w-4" />
                      Destino
                    </div>
                    <p className="font-semibold text-lg">{boleto.corrida.ruta.destino}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      Fecha
                    </div>
                    <p className="font-medium">
                      {format(new Date(boleto.corrida.fecha), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      Horario
                    </div>
                    <p className="font-medium">{formatTime(boleto.corrida.hora)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <User className="h-4 w-4" />
                      Pasajero
                    </div>
                    <p className="font-medium">{boleto.nombre_pasajero}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <p className="font-medium text-sm truncate">{boleto.email_pasajero}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de boleto</p>
                    <p className="font-medium">{LABELS_TIPO_BOLETO[boleto.tipo_boleto as TipoBoleto]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total pagado</p>
                    <p className="text-2xl font-bold text-primary">${boleto.precio_pagado.toFixed(2)}</p>
                  </div>
                </div>

                {/* Actions */}
                {boleto.estado === 'activo' && (
                  <div className="pt-4 border-t border-border flex gap-3">
                     <Dialog open={showModifyDialog} onOpenChange={(open) => {
                        setShowModifyDialog(open);
                        if (!open) setShowPaymentStep(false);
                      }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Edit className="h-4 w-4" />
                          Modificar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {showPaymentStep ? 'Pagar Diferencia' : 'Modificar Boleto'}
                          </DialogTitle>
                        </DialogHeader>
                        
                        {!showPaymentStep ? (
                          <div className="space-y-4 pt-4">
                            <div>
                              <Label>Nombre del Pasajero</Label>
                              <Input
                                value={modifyForm.nombre}
                                onChange={(e) => setModifyForm({ ...modifyForm, nombre: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Ruta</Label>
                              <Select value={modifyForm.rutaId} onValueChange={(v) => setModifyForm({ ...modifyForm, rutaId: v, horarioId: '' })}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
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
                              <Label>Fecha</Label>
                              <Input
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={modifyForm.fecha}
                                onChange={(e) => setModifyForm({ ...modifyForm, fecha: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            {horarios.length > 0 && (
                              <div>
                                <Label>Horario</Label>
                                <Select value={modifyForm.horarioId} onValueChange={(v) => setModifyForm({ ...modifyForm, horarioId: v })}>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Selecciona horario" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {horarios.map((h) => (
                                      <SelectItem key={h.id} value={h.id}>
                                        {formatTime(h.hora)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {precioDiferencia > 0 && (
                              <div className="p-4 bg-accent/10 rounded-lg">
                                <p className="text-sm text-muted-foreground">Diferencia a pagar:</p>
                                <p className="text-xl font-bold text-primary">${precioDiferencia.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  La nueva ruta es más cara. Deberás pagar la diferencia.
                                </p>
                              </div>
                            )}
                            <div className="flex gap-3 pt-4">
                              <Button variant="outline" onClick={() => setShowModifyDialog(false)} className="flex-1">
                                Cancelar
                              </Button>
                              <Button onClick={handleContinueToPayment} disabled={isModifying} className="flex-1">
                                {isModifying ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : precioDiferencia > 0 ? (
                                  <>
                                    <CreditCard className="h-4 w-4" />
                                    Continuar al Pago
                                  </>
                                ) : (
                                  'Guardar Cambios'
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 pt-4">
                            <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Precio anterior:</span>
                                <span>${boleto.precio_pagado.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Nueva ruta:</span>
                                <span>${rutas.find(r => r.id === modifyForm.rutaId)?.precio.toFixed(2)}</span>
                              </div>
                              <div className="border-t border-border pt-2 flex justify-between font-medium">
                                <span>Diferencia a pagar:</span>
                                <span className="text-primary">${precioDiferencia.toFixed(2)}</span>
                              </div>
                            </div>

                            <PaymentCardForm onValidChange={setIsCardValid} />

                            <div className="flex gap-3 pt-4">
                              <Button variant="outline" onClick={() => setShowPaymentStep(false)} className="flex-1">
                                Atrás
                              </Button>
                              <Button 
                                onClick={handleModificar} 
                                disabled={isModifying || !isCardValid} 
                                className="flex-1"
                              >
                                {isModifying ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CreditCard className="h-4 w-4" />
                                    Pagar ${precioDiferencia.toFixed(2)}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Button variant="accent" onClick={handleConvertirALibre} disabled={isConverting} className="flex-1">
                      {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Convertir a Libre
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Free Ticket */}
          {boletoLibre && (
            <div className="card-elevated overflow-hidden animate-fade-in">
              <div className="bg-gradient-accent p-6 text-accent-foreground">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-6 w-6" />
                    <span className="font-display text-xl font-bold">Boleto Libre</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    boletoLibre.usado ? 'bg-muted/20' : 'bg-success/20'
                  }`}>
                    {boletoLibre.usado ? 'Usado' : 'Disponible'}
                  </span>
                </div>
                <p className="text-sm opacity-80">Folio:</p>
                <p className="font-mono text-lg font-bold">{boletoLibre.folio}</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="text-2xl font-bold text-primary">${boletoLibre.valor.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Expira</p>
                    <p className="font-medium">
                      {format(new Date(boletoLibre.fecha_expiracion), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-lg p-4 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-2 text-accent" />
                  Este boleto puede canjearse por cualquier ruta. Si la ruta cuesta más, deberás pagar la diferencia.
                </div>

                {!boletoLibre.usado && (
                  <Button onClick={() => navigate(`/comprar?libre=${boletoLibre.id}`)} className="w-full">
                    Canjear Boleto Libre
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
