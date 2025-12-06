-- Create a secure function to insert tickets that returns the ticket ID
-- This bypasses RLS issues for guest purchases while maintaining security
CREATE OR REPLACE FUNCTION public.create_boleto(
  p_folio text,
  p_corrida_id uuid,
  p_user_id uuid,
  p_nombre_pasajero text,
  p_email_pasajero text,
  p_tipo_boleto tipo_boleto,
  p_precio_pagado numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boleto_id uuid;
BEGIN
  INSERT INTO boletos (
    folio,
    corrida_id,
    user_id,
    nombre_pasajero,
    email_pasajero,
    tipo_boleto,
    precio_pagado,
    estado
  ) VALUES (
    p_folio,
    p_corrida_id,
    p_user_id,
    p_nombre_pasajero,
    p_email_pasajero,
    p_tipo_boleto,
    p_precio_pagado,
    'activo'
  )
  RETURNING id INTO v_boleto_id;
  
  RETURN v_boleto_id;
END;
$$;