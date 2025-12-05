import { Link } from 'react-router-dom';
import { Bus, MapPin, Clock, Ticket, Gift, Search, ChevronRight, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';

export default function Index() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[600px] bg-gradient-hero overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center stagger-children">
            <div className="inline-flex items-center gap-2 bg-accent/20 backdrop-blur-sm text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Bus className="h-4 w-4" />
              <span>Más de 20 años conectando destinos</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              Tu viaje comienza con{' '}
              <span className="text-accent">Autobuses ICI</span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
              Viaja con comodidad, seguridad y los mejores precios. 
              Compra tus boletos en segundos, sin necesidad de crear cuenta.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" asChild>
                <Link to="/comprar">
                  <Ticket className="h-5 w-5" />
                  Comprar Boletos
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/rutas">
                  <Search className="h-5 w-5" />
                  Ver Rutas
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              ¿Por qué elegir Autobuses ICI?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ofrecemos la mejor experiencia de viaje con beneficios exclusivos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Horarios Flexibles"
              description="Múltiples salidas diarias para que viajes cuando lo necesites"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Viaje Seguro"
              description="Unidades modernas con todas las medidas de seguridad"
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Sin Cuenta"
              description="Compra boletos sin necesidad de registrarte"
            />
            <FeatureCard
              icon={<Gift className="h-6 w-6" />}
              title="Programa Fidelidad"
              description="Acumula puntos y obtén recompensas exclusivas"
            />
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ActionCard
              icon={<Ticket className="h-8 w-8" />}
              title="Comprar Boleto"
              description="Adquiere tu boleto en segundos sin necesidad de cuenta"
              href="/comprar"
              variant="primary"
            />
            <ActionCard
              icon={<Search className="h-8 w-8" />}
              title="Consultar Boleto"
              description="Ingresa tu folio para ver los detalles de tu viaje"
              href="/mi-boleto"
            />
            <ActionCard
              icon={<MapPin className="h-8 w-8" />}
              title="Ver Rutas"
              description="Explora todas nuestras rutas y horarios disponibles"
              href="/rutas"
            />
          </div>
        </div>
      </section>

      {/* Loyalty CTA */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="card-elevated p-8 md:p-12 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-accent mb-6">
              <Gift className="h-8 w-8 text-accent-foreground" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Programa de Fidelidad
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Regístrate y acumula puntos con cada boleto que compres. 
              Canjea tus puntos por descuentos exclusivos en tus próximos viajes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="accent" size="lg" asChild>
                <Link to="/auth">
                  Crear Cuenta Gratis
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/fidelidad">Conocer Más</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="card-elevated p-6 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function ActionCard({ 
  icon, 
  title, 
  description, 
  href,
  variant = 'default'
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  href: string;
  variant?: 'default' | 'primary';
}) {
  return (
    <Link 
      to={href} 
      className={`card-elevated p-6 group ${variant === 'primary' ? 'bg-gradient-primary text-primary-foreground' : ''}`}
    >
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 ${
        variant === 'primary' 
          ? 'bg-primary-foreground/20 text-primary-foreground' 
          : 'bg-primary/10 text-primary'
      }`}>
        {icon}
      </div>
      <h3 className={`font-display font-semibold text-xl mb-2 ${
        variant === 'primary' ? 'text-primary-foreground' : 'text-foreground'
      }`}>
        {title}
      </h3>
      <p className={`text-sm mb-4 ${
        variant === 'primary' ? 'text-primary-foreground/80' : 'text-muted-foreground'
      }`}>
        {description}
      </p>
      <div className={`inline-flex items-center gap-1 text-sm font-medium ${
        variant === 'primary' ? 'text-accent' : 'text-primary'
      } group-hover:gap-2 transition-all`}>
        <span>Ir ahora</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
