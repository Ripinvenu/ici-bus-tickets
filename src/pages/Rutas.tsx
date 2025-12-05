import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ArrowRight, Search, Ticket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Ruta, Horario } from '@/types/database';

interface RutaConHorarios extends Ruta {
  horarios: Horario[];
}

export default function Rutas() {
  const [rutas, setRutas] = useState<RutaConHorarios[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRutas();
  }, []);

  const fetchRutas = async () => {
    setIsLoading(true);
    
    const { data: rutasData, error: rutasError } = await supabase
      .from('rutas')
      .select('*')
      .eq('activa', true)
      .order('origen');

    if (rutasError) {
      console.error('Error fetching rutas:', rutasError);
      setIsLoading(false);
      return;
    }

    const { data: horariosData, error: horariosError } = await supabase
      .from('horarios')
      .select('*')
      .eq('activo', true)
      .order('hora');

    if (horariosError) {
      console.error('Error fetching horarios:', horariosError);
    }

    const rutasConHorarios = (rutasData || []).map((ruta) => ({
      ...ruta,
      precio: Number(ruta.precio),
      horarios: (horariosData || []).filter((h) => h.ruta_id === ruta.id),
    }));

    setRutas(rutasConHorarios);
    setIsLoading(false);
  };

  const filteredRutas = rutas.filter((ruta) => {
    const search = searchTerm.toLowerCase();
    return (
      ruta.origen.toLowerCase().includes(search) ||
      ruta.destino.toLowerCase().includes(search)
    );
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Layout>
      {/* Header */}
      <section className="bg-gradient-hero py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Nuestras Rutas
            </h1>
            <p className="text-primary-foreground/80 mb-8">
              Explora todas las rutas disponibles y encuentra la mejor opción para tu viaje
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por origen o destino..."
                className="pl-12 h-12 bg-card/90 backdrop-blur-sm border-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Routes List */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRutas.length === 0 ? (
            <div className="text-center py-20">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No se encontraron rutas</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Intenta con otro término de búsqueda' : 'No hay rutas disponibles en este momento'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredRutas.map((ruta) => (
                <RutaCard key={ruta.id} ruta={ruta} formatTime={formatTime} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

function RutaCard({ ruta, formatTime }: { ruta: RutaConHorarios; formatTime: (time: string) => string }) {
  return (
    <div className="card-elevated p-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Route Info */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Origen</p>
                <p className="font-semibold text-foreground">{ruta.origen}</p>
              </div>
            </div>
            
            <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
            
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Destino</p>
                <p className="font-semibold text-foreground">{ruta.destino}</p>
              </div>
            </div>
          </div>

          {/* Schedules */}
          {ruta.horarios.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Horarios:</span>
              {ruta.horarios.slice(0, 6).map((horario) => (
                <span
                  key={horario.id}
                  className="px-2 py-1 bg-secondary rounded-md text-xs font-medium text-secondary-foreground"
                >
                  {formatTime(horario.hora)}
                </span>
              ))}
              {ruta.horarios.length > 6 && (
                <span className="text-xs text-muted-foreground">
                  +{ruta.horarios.length - 6} más
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price & CTA */}
        <div className="flex items-center gap-4 lg:flex-col lg:items-end">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Desde</p>
            <p className="text-2xl font-bold text-primary">${ruta.precio.toFixed(2)}</p>
          </div>
          <Button variant="accent" asChild>
            <Link to={`/comprar?ruta=${ruta.id}`}>
              <Ticket className="h-4 w-4" />
              Comprar
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
