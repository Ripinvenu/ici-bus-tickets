import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Gift, Star, Ticket, TrendingUp, ChevronRight, Check, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Recompensa, Profile } from '@/types/database';

export default function Fidelidad() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user?.id,
  });

  const { data: recompensas, isLoading: loadingRecompensas } = useQuery({
    queryKey: ['recompensas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recompensas')
        .select('*')
        .eq('activa', true)
        .order('puntos_requeridos');
      if (error) throw error;
      return data as Recompensa[];
    },
  });

  const { data: recompensasCanjeadas } = useQuery({
    queryKey: ['recompensas-canjeadas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('recompensas_canjeadas')
        .select('*, recompensa:recompensas(*)')
        .eq('user_id', user.id)
        .eq('aplicada', false);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: historial } = useQuery({
    queryKey: ['historial-puntos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('historial_puntos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const canjearMutation = useMutation({
    mutationFn: async (recompensa: Recompensa) => {
      if (!user?.id || !profile) throw new Error('Usuario no autenticado');
      if ((profile.puntos_fidelidad ?? 0) < recompensa.puntos_requeridos) {
        throw new Error('Puntos insuficientes');
      }

      // Deduct points
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ puntos_fidelidad: (profile.puntos_fidelidad ?? 0) - recompensa.puntos_requeridos })
        .eq('id', user.id);
      if (profileError) throw profileError;

      // Create redeemed reward
      const { error: canjeError } = await supabase
        .from('recompensas_canjeadas')
        .insert({
          user_id: user.id,
          recompensa_id: recompensa.id,
          aplicada: false,
        });
      if (canjeError) throw canjeError;

      // Record in history
      const { error: historialError } = await supabase
        .from('historial_puntos')
        .insert({
          user_id: user.id,
          tipo: 'canje',
          puntos: -recompensa.puntos_requeridos,
          descripcion: `Canje: ${recompensa.nombre}`,
        });
      if (historialError) throw historialError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recompensas-canjeadas', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['historial-puntos', user?.id] });
      toast({ title: 'Recompensa canjeada', description: 'Se aplicará en tu próxima compra' });
    },
    onError: (error: Error) => toast({ title: error.message, variant: 'destructive' }),
  });

  const puntos = profile?.puntos_fidelidad ?? 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Programa de Fidelidad</h1>
          <p className="text-muted-foreground">Acumula puntos y obtén recompensas exclusivas</p>
        </div>

        {user ? (
          <div className="space-y-8">
            {/* Points Overview */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-gradient-primary text-primary-foreground md:col-span-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-primary-foreground/80 text-sm mb-1">Tus Puntos</p>
                      <p className="font-display text-5xl font-bold">{puntos}</p>
                      <p className="text-primary-foreground/60 text-sm mt-2">
                        1 boleto = 1 punto
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-primary-foreground/20">
                      <Star className="h-12 w-12" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-accent/20">
                      <Gift className="h-5 w-5 text-accent" />
                    </div>
                    <span className="font-medium">Recompensas Disponibles</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{recompensasCanjeadas?.length ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Por aplicar en tu próxima compra</p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Rewards */}
            {recompensasCanjeadas && recompensasCanjeadas.length > 0 && (
              <Card className="border-accent/50 bg-accent/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-accent">
                    <Check className="h-5 w-5" />
                    Recompensas por Aplicar
                  </CardTitle>
                  <CardDescription>Se aplicarán automáticamente en tu próxima compra</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {recompensasCanjeadas.map((canjeada: any) => (
                      <div
                        key={canjeada.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-accent font-medium"
                      >
                        <Gift className="h-4 w-4" />
                        {canjeada.recompensa?.nombre}
                        {canjeada.recompensa?.descuento_porcentaje
                          ? ` (${canjeada.recompensa.descuento_porcentaje}%)`
                          : ` ($${canjeada.recompensa?.descuento_fijo})`}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Available Rewards */}
            <div>
              <h2 className="font-display text-xl font-semibold mb-4">Recompensas Disponibles</h2>
              {loadingRecompensas ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recompensas?.map((recompensa) => {
                    const canRedeem = puntos >= recompensa.puntos_requeridos;
                    const progress = Math.min((puntos / recompensa.puntos_requeridos) * 100, 100);

                    return (
                      <Card key={recompensa.id} className={!canRedeem ? 'opacity-75' : ''}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="p-2 rounded-lg bg-accent/20">
                              <Gift className="h-5 w-5 text-accent" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
                              {recompensa.puntos_requeridos} pts
                            </span>
                          </div>
                          <CardTitle className="text-lg mt-2">{recompensa.nombre}</CardTitle>
                          {recompensa.descripcion && (
                            <CardDescription>{recompensa.descripcion}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="text-lg font-semibold text-primary">
                              {recompensa.descuento_porcentaje
                                ? `${recompensa.descuento_porcentaje}% de descuento`
                                : `$${recompensa.descuento_fijo} MXN de descuento`}
                            </div>
                            
                            {!canRedeem && (
                              <div className="space-y-1">
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Te faltan {recompensa.puntos_requeridos - puntos} puntos
                                </p>
                              </div>
                            )}

                            <Button
                              className="w-full"
                              disabled={!canRedeem}
                              onClick={() => canjearMutation.mutate(recompensa)}
                            >
                              {canRedeem ? 'Canjear' : 'Puntos insuficientes'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {recompensas?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      No hay recompensas disponibles en este momento
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* History */}
            {historial && historial.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold mb-4">Historial de Puntos</h2>
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {historial.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${item.puntos > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                              {item.puntos > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <Gift className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{item.descripcion}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.created_at!).toLocaleDateString('es-MX')}
                              </p>
                            </div>
                          </div>
                          <span className={`font-semibold ${item.puntos > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {item.puntos > 0 ? '+' : ''}{item.puntos}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          /* Guest View */
          <div className="max-w-2xl mx-auto text-center">
            <Card className="p-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-accent mb-6">
                <Gift className="h-8 w-8 text-accent-foreground" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-4">¡Únete al Programa de Fidelidad!</h2>
              <p className="text-muted-foreground mb-6">
                Crea una cuenta gratuita y comienza a acumular puntos con cada boleto que compres. 
                Canjea tus puntos por descuentos exclusivos en tus próximos viajes.
              </p>

              <div className="grid gap-4 md:grid-cols-3 mb-8">
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <Ticket className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="font-medium">Compra Boletos</p>
                  <p className="text-sm text-muted-foreground">1 boleto = 1 punto</p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <Star className="h-8 w-8 text-accent mx-auto mb-2" />
                  <p className="font-medium">Acumula Puntos</p>
                  <p className="text-sm text-muted-foreground">Sin fecha de expiración</p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <Gift className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="font-medium">Obtén Descuentos</p>
                  <p className="text-sm text-muted-foreground">Canjea por recompensas</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="accent" size="lg" asChild>
                  <Link to="/auth">
                    Crear Cuenta Gratis
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/auth">Ya tengo cuenta</Link>
                </Button>
              </div>
            </Card>

            {/* Preview Rewards */}
            <div className="mt-12">
              <h3 className="font-display text-xl font-semibold mb-6">Recompensas que puedes obtener</h3>
              {loadingRecompensas ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recompensas?.slice(0, 3).map((recompensa) => (
                    <Card key={recompensa.id}>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Gift className="h-5 w-5 text-accent" />
                          <CardTitle className="text-lg">{recompensa.nombre}</CardTitle>
                        </div>
                        <CardDescription>{recompensa.descripcion}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-primary font-semibold">
                            {recompensa.descuento_porcentaje
                              ? `${recompensa.descuento_porcentaje}%`
                              : `$${recompensa.descuento_fijo}`}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {recompensa.puntos_requeridos} puntos
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}