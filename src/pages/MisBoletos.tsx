import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, Calendar, MapPin, Clock, User, ChevronRight, TicketX } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { LABELS_TIPO_BOLETO } from '@/types/database';

interface BoletoConDetalles {
  id: string;
  folio: string;
  nombre_pasajero: string;
  email_pasajero: string;
  tipo_boleto: 'estudiante' | 'adulto_mayor' | 'menor' | 'adulto';
  precio_pagado: number;
  estado: 'activo' | 'usado' | 'cancelado' | 'convertido_libre';
  created_at: string;
  corrida: {
    fecha: string;
    hora: string;
    ruta: {
      origen: string;
      destino: string;
    };
  };
}

interface BoletoLibreConDetalles {
  id: string;
  folio: string;
  valor: number;
  fecha_expiracion: string;
  usado: boolean;
  created_at: string;
  boleto_original: {
    folio: string;
  };
}

export default function MisBoletos() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: boletos, isLoading: loadingBoletos } = useQuery({
    queryKey: ['mis-boletos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('boletos')
        .select(`
          *,
          corrida:corridas(
            fecha,
            hora,
            ruta:rutas(origen, destino)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BoletoConDetalles[];
    },
    enabled: !!user?.id,
  });

  const { data: boletosLibres, isLoading: loadingLibres } = useQuery({
    queryKey: ['mis-boletos-libres', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Get free tickets from user's original tickets
      const { data: userBoletos } = await supabase
        .from('boletos')
        .select('id')
        .eq('user_id', user.id);
      
      if (!userBoletos?.length) return [];
      
      const boletoIds = userBoletos.map(b => b.id);
      
      const { data, error } = await supabase
        .from('boletos_libres')
        .select(`
          *,
          boleto_original:boletos!boletos_libres_boleto_original_id_fkey(folio)
        `)
        .in('boleto_original_id', boletoIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BoletoLibreConDetalles[];
    },
    enabled: !!user?.id,
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const boletosActivos = boletos?.filter(b => b.estado === 'activo') ?? [];
  const boletosUsados = boletos?.filter(b => b.estado !== 'activo') ?? [];
  const libresActivos = boletosLibres?.filter(b => !b.usado) ?? [];
  const libresUsados = boletosLibres?.filter(b => b.usado) ?? [];

  const isLoading = loadingBoletos || loadingLibres;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Mis Boletos</h1>
          <p className="text-muted-foreground">Historial de todos tus boletos comprados con tu cuenta</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <Tabs defaultValue="activos" className="space-y-6">
            <TabsList>
              <TabsTrigger value="activos" className="gap-2">
                <Ticket className="h-4 w-4" />
                Activos ({boletosActivos.length})
              </TabsTrigger>
              <TabsTrigger value="libres" className="gap-2">
                <TicketX className="h-4 w-4" />
                Boletos Libres ({libresActivos.length})
              </TabsTrigger>
              <TabsTrigger value="historial" className="gap-2">
                <Clock className="h-4 w-4" />
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activos">
              {boletosActivos.length === 0 ? (
                <EmptyState
                  icon={<Ticket className="h-12 w-12" />}
                  title="No tienes boletos activos"
                  description="Compra tu próximo boleto y aparecerá aquí"
                  actionLabel="Comprar Boleto"
                  actionHref="/comprar"
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {boletosActivos.map((boleto) => (
                    <BoletoCard key={boleto.id} boleto={boleto} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="libres">
              {libresActivos.length === 0 ? (
                <EmptyState
                  icon={<TicketX className="h-12 w-12" />}
                  title="No tienes boletos libres"
                  description="Puedes convertir un boleto existente en boleto libre desde la página de consulta"
                  actionLabel="Consultar Boleto"
                  actionHref="/mi-boleto"
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {libresActivos.map((libre) => (
                    <BoletoLibreCard key={libre.id} boleto={libre} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="historial">
              <div className="space-y-6">
                {boletosUsados.length > 0 && (
                  <div>
                    <h3 className="font-medium text-muted-foreground mb-4">Boletos Usados/Convertidos</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {boletosUsados.map((boleto) => (
                        <BoletoCard key={boleto.id} boleto={boleto} />
                      ))}
                    </div>
                  </div>
                )}
                {libresUsados.length > 0 && (
                  <div>
                    <h3 className="font-medium text-muted-foreground mb-4">Boletos Libres Usados</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {libresUsados.map((libre) => (
                        <BoletoLibreCard key={libre.id} boleto={libre} />
                      ))}
                    </div>
                  </div>
                )}
                {boletosUsados.length === 0 && libresUsados.length === 0 && (
                  <EmptyState
                    icon={<Clock className="h-12 w-12" />}
                    title="Sin historial"
                    description="Aquí aparecerán tus boletos usados y convertidos"
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}

function BoletoCard({ boleto }: { boleto: BoletoConDetalles }) {
  const estadoStyles: Record<string, string> = {
    activo: 'bg-green-500/10 text-green-600 border-green-500/20',
    usado: 'bg-muted text-muted-foreground',
    cancelado: 'bg-destructive/10 text-destructive',
    convertido_libre: 'bg-accent/10 text-accent',
  };

  const estadoLabels: Record<string, string> = {
    activo: 'Activo',
    usado: 'Usado',
    cancelado: 'Cancelado',
    convertido_libre: 'Convertido a Libre',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {boleto.corrida.ruta.origen} → {boleto.corrida.ruta.destino}
            </CardTitle>
            <CardDescription className="font-mono">{boleto.folio}</CardDescription>
          </div>
          <Badge className={estadoStyles[boleto.estado]}>
            {estadoLabels[boleto.estado]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(boleto.corrida.fecha).toLocaleDateString('es-MX')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{boleto.corrida.hora.slice(0, 5)}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{boleto.nombre_pasajero}</span>
          </div>
          <div>
            <Badge variant="outline">{LABELS_TIPO_BOLETO[boleto.tipo_boleto]}</Badge>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="font-semibold text-lg">${boleto.precio_pagado} MXN</span>
          {boleto.estado === 'activo' && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/mi-boleto?folio=${boleto.folio}`}>
                Ver Detalles
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BoletoLibreCard({ boleto }: { boleto: BoletoLibreConDetalles }) {
  const isExpired = new Date(boleto.fecha_expiracion) < new Date();
  const isValid = !boleto.usado && !isExpired;

  return (
    <Card className={!isValid ? 'opacity-75' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TicketX className="h-4 w-4 text-accent" />
              Boleto Libre
            </CardTitle>
            <CardDescription className="font-mono">{boleto.folio}</CardDescription>
          </div>
          <Badge className={isValid ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}>
            {boleto.usado ? 'Usado' : isExpired ? 'Expirado' : 'Válido'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Valor</span>
            <span className="font-semibold">${boleto.valor} MXN</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Expira</span>
            <span>{new Date(boleto.fecha_expiracion).toLocaleDateString('es-MX')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Boleto Original</span>
            <span className="font-mono text-xs">{boleto.boleto_original.folio}</span>
          </div>
        </div>
        {isValid && (
          <Button className="w-full mt-4" variant="accent" asChild>
            <Link to={`/mi-boleto?folio=${boleto.boleto_original.folio}`}>
              Usar Boleto Libre
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted text-muted-foreground mb-4">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild>
          <Link to={actionHref}>
            {actionLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}