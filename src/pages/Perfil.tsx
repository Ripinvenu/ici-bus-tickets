import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Calendar, Lock, Save, Gift } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import type { Profile } from '@/types/database';

export default function Perfil() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const { data: profile, isLoading } = useQuery({
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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast({ title: 'Perfil actualizado correctamente' });
      setIsEditing(false);
    },
    onError: () => toast({ title: 'Error al actualizar perfil', variant: 'destructive' }),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Contraseña actualizada correctamente' });
      setShowPasswordForm(false);
    },
    onError: (error: Error) => toast({ title: error.message, variant: 'destructive' }),
  });

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateProfileMutation.mutate({
      nombre: formData.get('nombre') as string,
      fecha_nacimiento: formData.get('fecha_nacimiento') as string || null,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (newPassword !== confirmPassword) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' });
      return;
    }

    updatePasswordMutation.mutate(newPassword);
  };

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información personal</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Points Card */}
            <Card className="bg-gradient-primary text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary-foreground/20">
                      <Gift className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-primary-foreground/80 text-sm">Puntos de Fidelidad</p>
                      <p className="font-display text-3xl font-bold">{profile?.puntos_fidelidad ?? 0}</p>
                    </div>
                  </div>
                  <Button variant="hero" size="sm" asChild>
                    <Link to="/fidelidad">Ver Recompensas</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Profile Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Información Personal
                    </CardTitle>
                    <CardDescription>Tu información de cuenta</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      Editar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre Completo</Label>
                      <Input
                        id="nombre"
                        name="nombre"
                        defaultValue={profile?.nombre}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input
                        id="email"
                        value={profile?.email ?? user.email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">El correo no puede ser modificado</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                      <Input
                        id="fecha_nacimiento"
                        name="fecha_nacimiento"
                        type="date"
                        defaultValue={profile?.fecha_nacimiento ?? ''}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="gap-2">
                        <Save className="h-4 w-4" />
                        Guardar
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Nombre</p>
                        <p className="font-medium">{profile?.nombre ?? 'No especificado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Correo</p>
                        <p className="font-medium">{profile?.email ?? user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha de Nacimiento</p>
                        <p className="font-medium">
                          {profile?.fecha_nacimiento
                            ? new Date(profile.fecha_nacimiento).toLocaleDateString('es-MX')
                            : 'No especificada'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Password Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Seguridad
                </CardTitle>
                <CardDescription>Cambia tu contraseña</CardDescription>
              </CardHeader>
              <CardContent>
                {showPasswordForm ? (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new_password">Nueva Contraseña</Label>
                      <Input
                        id="new_password"
                        name="new_password"
                        type="password"
                        minLength={6}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirmar Contraseña</Label>
                      <Input
                        id="confirm_password"
                        name="confirm_password"
                        type="password"
                        minLength={6}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">Actualizar Contraseña</Button>
                      <Button type="button" variant="outline" onClick={() => setShowPasswordForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                    Cambiar Contraseña
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}