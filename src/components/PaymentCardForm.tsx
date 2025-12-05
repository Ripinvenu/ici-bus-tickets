import { useState } from 'react';
import { CreditCard, Calendar, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PaymentCardFormProps {
  onValidChange: (isValid: boolean) => void;
}

export function PaymentCardForm({ onValidChange }: PaymentCardFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiryDate = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const validateCardNumber = (num: string): boolean => {
    const digits = num.replace(/\s/g, '');
    return digits.length === 16 && /^\d{16}$/.test(digits);
  };

  const validateExpiryDate = (date: string): boolean => {
    const match = date.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;
    
    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10) + 2000;
    
    if (month < 1 || month > 12) return false;
    
    const now = new Date();
    const expiry = new Date(year, month - 1);
    return expiry > now;
  };

  const validateCvv = (code: string): boolean => {
    return /^\d{3}$/.test(code);
  };

  const validateCardHolder = (name: string): boolean => {
    return name.trim().length >= 3;
  };

  const validateAll = (
    number: string,
    holder: string,
    expiry: string,
    code: string
  ) => {
    const newErrors: Record<string, string> = {};

    if (!validateCardNumber(number)) {
      newErrors.cardNumber = 'Número de tarjeta debe tener 16 dígitos';
    }
    if (!validateCardHolder(holder)) {
      newErrors.cardHolder = 'Nombre del titular requerido';
    }
    if (!validateExpiryDate(expiry)) {
      newErrors.expiryDate = 'Fecha inválida o expirada';
    }
    if (!validateCvv(code)) {
      newErrors.cvv = 'CVV debe tener 3 dígitos';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0 && 
      number.replace(/\s/g, '').length === 16 &&
      holder.trim().length >= 3 &&
      expiry.length === 5 &&
      code.length === 3;
    onValidChange(isValid);
  };

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value);
    setCardNumber(formatted);
    validateAll(formatted, cardHolder, expiryDate, cvv);
  };

  const handleCardHolderChange = (value: string) => {
    setCardHolder(value.toUpperCase());
    validateAll(cardNumber, value, expiryDate, cvv);
  };

  const handleExpiryChange = (value: string) => {
    const formatted = formatExpiryDate(value);
    setExpiryDate(formatted);
    validateAll(cardNumber, cardHolder, formatted, cvv);
  };

  const handleCvvChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 3);
    setCvv(digits);
    validateAll(cardNumber, cardHolder, expiryDate, digits);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-5 text-primary-foreground shadow-lg">
        <div className="flex justify-between items-start mb-8">
          <div className="w-12 h-8 bg-amber-400/90 rounded-md" />
          <CreditCard className="h-8 w-8 opacity-80" />
        </div>
        <div className="font-mono text-xl tracking-wider mb-4">
          {cardNumber || '•••• •••• •••• ••••'}
        </div>
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-xs opacity-70">TITULAR</p>
            <p className="font-medium">{cardHolder || 'NOMBRE APELLIDO'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">EXPIRA</p>
            <p className="font-medium">{expiryDate || 'MM/AA'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div>
          <Label htmlFor="cardNumber">Número de Tarjeta</Label>
          <div className="relative mt-1">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="cardNumber"
              placeholder="1234 5678 9012 3456"
              className="pl-10 font-mono"
              value={cardNumber}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              maxLength={19}
            />
          </div>
          {errors.cardNumber && (
            <p className="text-sm text-destructive mt-1">{errors.cardNumber}</p>
          )}
        </div>

        <div>
          <Label htmlFor="cardHolder">Nombre del Titular</Label>
          <Input
            id="cardHolder"
            placeholder="NOMBRE APELLIDO"
            className="mt-1 uppercase"
            value={cardHolder}
            onChange={(e) => handleCardHolderChange(e.target.value)}
            maxLength={50}
          />
          {errors.cardHolder && (
            <p className="text-sm text-destructive mt-1">{errors.cardHolder}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="expiry">Fecha de Expiración</Label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="expiry"
                placeholder="MM/AA"
                className="pl-10 font-mono"
                value={expiryDate}
                onChange={(e) => handleExpiryChange(e.target.value)}
                maxLength={5}
              />
            </div>
            {errors.expiryDate && (
              <p className="text-sm text-destructive mt-1">{errors.expiryDate}</p>
            )}
          </div>

          <div>
            <Label htmlFor="cvv">CVV</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="cvv"
                type="password"
                placeholder="•••"
                className="pl-10 font-mono"
                value={cvv}
                onChange={(e) => handleCvvChange(e.target.value)}
                maxLength={3}
              />
            </div>
            {errors.cvv && (
              <p className="text-sm text-destructive mt-1">{errors.cvv}</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        🔒 Esta es una pasarela de pago simulada. No se procesarán cargos reales.
      </p>
    </div>
  );
}
