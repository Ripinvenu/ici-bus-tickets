import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, MapPin, Gift, Clock, Shield } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import type { Ruta, Horario, Recompensa } from '@/types/database';

export default function Admin() {
  const { user, isAdmin, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">Panel de Administración</h1>
          </div>
          <p className="text-muted-foreground">Gestiona rutas, horarios y recompensas del sistema</p>
        </div>

        <Tabs defaultValue="rutas" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="rutas" className="gap-2">
              <MapPin className="h-4 w-4" />
              Rutas
            </TabsTrigger>
            <TabsTrigger value="recompensas" className="gap-2">
              <Gift className="h-4 w-4" />
              Recompensas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rutas">
            <RutasManagement />
          </TabsContent>

          <TabsContent value="recompensas">
            <RecompensasManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function RutasManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRuta, setEditingRuta] = useState<Ruta | null>(null);
  const [selectedRutaForHorarios, setSelectedRutaForHorarios] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rutas, isLoading } = useQuery({
    queryKey: ['admin-rutas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rutas')
        .select('*')
        .order('origen');
      if (error) throw error;
      return data as Ruta[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (ruta: Omit<Ruta, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('rutas').insert(ruta);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rutas'] });
      toast({ title: 'Ruta creada exitosamente' });
      setIsDialogOpen(false);
    },
    onError: () => toast({ title: 'Error al crear ruta', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Ruta> & { id: string }) => {
      const { error } = await supabase.from('rutas').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rutas'] });
      toast({ title: 'Ruta actualizada' });
      setEditingRuta(null);
      setIsDialogOpen(false);
    },
    onError: () => toast({ title: 'Error al actualizar', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rutas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rutas'] });
      toast({ title: 'Ruta eliminada' });
    },
    onError: () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      origen: formData.get('origen') as string,
      destino: formData.get('destino') as string,
      precio: parseFloat(formData.get('precio') as string),
      activa: true,
    };

    if (editingRuta) {
      updateMutation.mutate({ id: editingRuta.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl font-semibold">Gestión de Rutas</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingRuta(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Ruta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRuta ? 'Editar Ruta' : 'Nueva Ruta'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="origen">Origen</Label>
                <Input id="origen" name="origen" defaultValue={editingRuta?.origen} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destino">Destino</Label>
                <Input id="destino" name="destino" defaultValue={editingRuta?.destino} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio">Precio (MXN)</Label>
                <Input id="precio" name="precio" type="number" step="0.01" defaultValue={editingRuta?.precio} required />
              </div>
              <Button type="submit" className="w-full">
                {editingRuta ? 'Guardar Cambios' : 'Crear Ruta'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid gap-4">
          {rutas?.map((ruta) => (
            <Card key={ruta.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${ruta.activa ? 'bg-primary/10' : 'bg-muted'}`}>
                      <MapPin className={`h-5 w-5 ${ruta.activa ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{ruta.origen} → {ruta.destino}</CardTitle>
                      <CardDescription>${ruta.precio} MXN</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ruta.activa ?? true}
                      onCheckedChange={(checked) => updateMutation.mutate({ id: ruta.id, activa: checked })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingRuta(ruta); setIsDialogOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(ruta.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setSelectedRutaForHorarios(selectedRutaForHorarios === ruta.id ? null : ruta.id)}
                >
                  <Clock className="h-4 w-4" />
                  {selectedRutaForHorarios === ruta.id ? 'Ocultar Horarios' : 'Ver Horarios'}
                </Button>
                {selectedRutaForHorarios === ruta.id && (
                  <HorariosManagement rutaId={ruta.id} />
                )}
              </CardContent>
            </Card>
          ))}
          {rutas?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No hay rutas registradas. Crea la primera ruta.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HorariosManagement({ rutaId }: { rutaId: string }) {
  const [newHora, setNewHora] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: horarios, isLoading } = useQuery({
    queryKey: ['horarios', rutaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('horarios')
        .select('*')
        .eq('ruta_id', rutaId)
        .order('hora');
      if (error) throw error;
      return data as Horario[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (hora: string) => {
      const { error } = await supabase.from('horarios').insert({
        ruta_id: rutaId,
        hora,
        activo: true,
        dias_semana: [0, 1, 2, 3, 4, 5, 6],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horarios', rutaId] });
      toast({ title: 'Horario agregado' });
      setNewHora('');
    },
    onError: () => toast({ title: 'Error al agregar horario', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('horarios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horarios', rutaId] });
      toast({ title: 'Horario eliminado' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from('horarios').update({ activo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['horarios', rutaId] }),
  });

  return (
    <div className="mt-4 p-4 bg-secondary/30 rounded-lg space-y-4">
      <div className="flex gap-2">
        <Input
          type="time"
          value={newHora}
          onChange={(e) => setNewHora(e.target.value)}
          className="w-40"
        />
        <Button size="sm" onClick={() => newHora && createMutation.mutate(newHora)}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {isLoading ? (
        <div className="animate-pulse h-8 bg-muted rounded" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {horarios?.map((horario) => (
            <div
              key={horario.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                horario.activo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              <span>{horario.hora.slice(0, 5)}</span>
              <Switch
                checked={horario.activo ?? true}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: horario.id, activo: checked })}
                className="scale-75"
              />
              <button
                onClick={() => deleteMutation.mutate(horario.id)}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {horarios?.length === 0 && (
            <span className="text-muted-foreground text-sm">Sin horarios</span>
          )}
        </div>
      )}
    </div>
  );
}

function RecompensasManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecompensa, setEditingRecompensa] = useState<Recompensa | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recompensas, isLoading } = useQuery({
    queryKey: ['admin-recompensas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recompensas')
        .select('*')
        .order('puntos_requeridos');
      if (error) throw error;
      return data as Recompensa[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (recompensa: Omit<Recompensa, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('recompensas').insert(recompensa);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recompensas'] });
      toast({ title: 'Recompensa creada exitosamente' });
      setIsDialogOpen(false);
    },
    onError: () => toast({ title: 'Error al crear recompensa', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Recompensa> & { id: string }) => {
      const { error } = await supabase.from('recompensas').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recompensas'] });
      toast({ title: 'Recompensa actualizada' });
      setEditingRecompensa(null);
      setIsDialogOpen(false);
    },
    onError: () => toast({ title: 'Error al actualizar', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recompensas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recompensas'] });
      toast({ title: 'Recompensa eliminada' });
    },
    onError: () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tipoDescuento = formData.get('tipo_descuento') as string;
    const data = {
      nombre: formData.get('nombre') as string,
      descripcion: formData.get('descripcion') as string,
      puntos_requeridos: parseInt(formData.get('puntos_requeridos') as string),
      descuento_porcentaje: tipoDescuento === 'porcentaje' ? parseFloat(formData.get('valor_descuento') as string) : null,
      descuento_fijo: tipoDescuento === 'fijo' ? parseFloat(formData.get('valor_descuento') as string) : null,
      activa: true,
    };

    if (editingRecompensa) {
      updateMutation.mutate({ id: editingRecompensa.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl font-semibold">Gestión de Recompensas</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingRecompensa(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Recompensa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRecompensa ? 'Editar Recompensa' : 'Nueva Recompensa'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" defaultValue={editingRecompensa?.nombre} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" name="descripcion" defaultValue={editingRecompensa?.descripcion ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="puntos_requeridos">Puntos Requeridos</Label>
                <Input id="puntos_requeridos" name="puntos_requeridos" type="number" defaultValue={editingRecompensa?.puntos_requeridos} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_descuento">Tipo de Descuento</Label>
                <select
                  id="tipo_descuento"
                  name="tipo_descuento"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  defaultValue={editingRecompensa?.descuento_porcentaje ? 'porcentaje' : 'fijo'}
                >
                  <option value="porcentaje">Porcentaje</option>
                  <option value="fijo">Monto Fijo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_descuento">Valor del Descuento</Label>
                <Input
                  id="valor_descuento"
                  name="valor_descuento"
                  type="number"
                  step="0.01"
                  defaultValue={editingRecompensa?.descuento_porcentaje ?? editingRecompensa?.descuento_fijo ?? ''}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingRecompensa ? 'Guardar Cambios' : 'Crear Recompensa'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recompensas?.map((recompensa) => (
            <Card key={recompensa.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${recompensa.activa ? 'bg-accent/20' : 'bg-muted'}`}>
                      <Gift className={`h-5 w-5 ${recompensa.activa ? 'text-accent' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{recompensa.nombre}</CardTitle>
                      <CardDescription>{recompensa.descripcion}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={recompensa.activa ?? true}
                      onCheckedChange={(checked) => updateMutation.mutate({ id: recompensa.id, activa: checked })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingRecompensa(recompensa); setIsDialogOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(recompensa.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {recompensa.puntos_requeridos} puntos
                  </span>
                  <span className="text-primary font-medium">
                    {recompensa.descuento_porcentaje
                      ? `${recompensa.descuento_porcentaje}% descuento`
                      : `$${recompensa.descuento_fijo} MXN descuento`}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {recompensas?.length === 0 && (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              No hay recompensas registradas. Crea la primera recompensa.
            </div>
          )}
        </div>
      )}
    </div>
  );
}