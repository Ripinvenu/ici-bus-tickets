import { Bus, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-gradient-hero text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-lg">
                <Bus className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl">Autobuses ICI</h3>
                <p className="text-sm text-primary-foreground/70">Tu viaje, nuestra prioridad</p>
              </div>
            </div>
            <p className="text-primary-foreground/80 max-w-md">
              Conectando destinos con seguridad, comodidad y puntualidad. 
              Más de 20 años llevándote a donde necesitas llegar.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/rutas" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  Consultar Rutas
                </Link>
              </li>
              <li>
                <Link to="/comprar" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  Comprar Boletos
                </Link>
              </li>
              <li>
                <Link to="/mi-boleto" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  Consultar Boleto
                </Link>
              </li>
              <li>
                <Link to="/fidelidad" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  Programa de Fidelidad
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contacto</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-primary-foreground/80">
                <Phone className="h-4 w-4" />
                <span>+52 (55) 1234-5678</span>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/80">
                <Mail className="h-4 w-4" />
                <span>contacto@autobusesici.com</span>
              </li>
              <li className="flex items-start gap-2 text-primary-foreground/80">
                <MapPin className="h-4 w-4 mt-1" />
                <span>Terminal Central, CDMX</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/60 text-sm">
          <p>© {new Date().getFullYear()} Autobuses ICI. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
