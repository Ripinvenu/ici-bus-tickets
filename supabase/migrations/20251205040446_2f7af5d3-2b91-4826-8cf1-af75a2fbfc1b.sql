-- Enum para tipos de boleto
CREATE TYPE public.tipo_boleto AS ENUM ('estudiante', 'adulto_mayor', 'menor', 'adulto');

-- Enum para estado del boleto
CREATE TYPE public.estado_boleto AS ENUM ('activo', 'usado', 'cancelado', 'convertido_libre');

-- Tabla de perfiles de usuarios (clientes)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  fecha_nacimiento DATE,
  puntos_fidelidad INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de administradores
CREATE TABLE public.administradores (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de rutas
CREATE TABLE public.rutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de horarios por ruta
CREATE TABLE public.horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID NOT NULL REFERENCES public.rutas(id) ON DELETE CASCADE,
  hora TIME NOT NULL,
  dias_semana INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de corridas (instancias específicas de un horario en una fecha)
CREATE TABLE public.corridas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID NOT NULL REFERENCES public.rutas(id) ON DELETE CASCADE,
  horario_id UUID NOT NULL REFERENCES public.horarios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  capacidad INTEGER DEFAULT 40,
  boletos_vendidos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(horario_id, fecha)
);

-- Tabla de boletos
CREATE TABLE public.boletos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio TEXT UNIQUE NOT NULL,
  corrida_id UUID NOT NULL REFERENCES public.corridas(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre_pasajero TEXT NOT NULL,
  email_pasajero TEXT NOT NULL,
  tipo_boleto tipo_boleto NOT NULL,
  precio_pagado DECIMAL(10,2) NOT NULL,
  estado estado_boleto DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de boletos libres
CREATE TABLE public.boletos_libres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boleto_original_id UUID NOT NULL REFERENCES public.boletos(id) ON DELETE CASCADE,
  folio TEXT UNIQUE NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  fecha_expiracion DATE NOT NULL,
  usado BOOLEAN DEFAULT false,
  usado_en_boleto_id UUID REFERENCES public.boletos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de recompensas
CREATE TABLE public.recompensas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  puntos_requeridos INTEGER NOT NULL,
  descuento_porcentaje DECIMAL(5,2),
  descuento_fijo DECIMAL(10,2),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de historial de puntos
CREATE TABLE public.historial_puntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boleto_id UUID REFERENCES public.boletos(id) ON DELETE SET NULL,
  puntos INTEGER NOT NULL,
  tipo TEXT NOT NULL, -- 'ganado' o 'canjeado'
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de recompensas canjeadas (pendientes de aplicar)
CREATE TABLE public.recompensas_canjeadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recompensa_id UUID NOT NULL REFERENCES public.recompensas(id) ON DELETE CASCADE,
  aplicada BOOLEAN DEFAULT false,
  boleto_aplicado_id UUID REFERENCES public.boletos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  aplicada_at TIMESTAMPTZ
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos_libres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recompensas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_puntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recompensas_canjeadas ENABLE ROW LEVEL SECURITY;

-- Función para verificar si es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.administradores WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para administradores
CREATE POLICY "Admins can view themselves" ON public.administradores FOR SELECT USING (auth.uid() = id);

-- Políticas para rutas (públicas para lectura)
CREATE POLICY "Anyone can view active routes" ON public.rutas FOR SELECT USING (activa = true);
CREATE POLICY "Admins can view all routes" ON public.rutas FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert routes" ON public.rutas FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update routes" ON public.rutas FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete routes" ON public.rutas FOR DELETE USING (public.is_admin());

-- Políticas para horarios
CREATE POLICY "Anyone can view active schedules" ON public.horarios FOR SELECT USING (activo = true);
CREATE POLICY "Admins can manage schedules" ON public.horarios FOR ALL USING (public.is_admin());

-- Políticas para corridas
CREATE POLICY "Anyone can view runs" ON public.corridas FOR SELECT USING (true);
CREATE POLICY "Admins can manage runs" ON public.corridas FOR ALL USING (public.is_admin());
CREATE POLICY "System can insert runs" ON public.corridas FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update runs" ON public.corridas FOR UPDATE USING (true);

-- Políticas para boletos
CREATE POLICY "Anyone can view their tickets by folio" ON public.boletos FOR SELECT USING (true);
CREATE POLICY "Anyone can buy tickets" ON public.boletos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tickets" ON public.boletos FOR UPDATE USING (true);
CREATE POLICY "Admins can manage all tickets" ON public.boletos FOR ALL USING (public.is_admin());

-- Políticas para boletos libres
CREATE POLICY "Anyone can view free tickets" ON public.boletos_libres FOR SELECT USING (true);
CREATE POLICY "Anyone can create free tickets" ON public.boletos_libres FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update free tickets" ON public.boletos_libres FOR UPDATE USING (true);

-- Políticas para recompensas
CREATE POLICY "Anyone can view active rewards" ON public.recompensas FOR SELECT USING (activa = true);
CREATE POLICY "Admins can view all rewards" ON public.recompensas FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage rewards" ON public.recompensas FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update rewards" ON public.recompensas FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete rewards" ON public.recompensas FOR DELETE USING (public.is_admin());

-- Políticas para historial de puntos
CREATE POLICY "Users can view own points" ON public.historial_puntos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert points" ON public.historial_puntos FOR INSERT WITH CHECK (true);

-- Políticas para recompensas canjeadas
CREATE POLICY "Users can view own redeemed rewards" ON public.recompensas_canjeadas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can redeem rewards" ON public.recompensas_canjeadas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update redeemed rewards" ON public.recompensas_canjeadas FOR UPDATE USING (true);

-- Función para generar folio único
CREATE OR REPLACE FUNCTION public.generate_folio()
RETURNS TEXT AS $$
DECLARE
  new_folio TEXT;
BEGIN
  new_folio := 'ICI-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
  RETURN new_folio;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rutas_updated_at BEFORE UPDATE ON public.rutas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boletos_updated_at BEFORE UPDATE ON public.boletos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recompensas_updated_at BEFORE UPDATE ON public.recompensas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();