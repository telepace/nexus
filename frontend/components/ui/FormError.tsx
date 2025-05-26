interface ErrorState {
  errors?: {
    [key: string]: string | string[];
  };
  server_validation_error?: string;
  server_error?: string;
  message?: string;
}

interface FormErrorProps {
  state?: ErrorState;
  className?: string;
}

export function FormError({ state, className = "" }: FormErrorProps) {
  if (!state) return null;

  const error =
    state.message || state.server_validation_error || state.server_error;
  if (!error) return null;

  return (
    <p
      data-testid="form-error"
      className={`text-sm text-destructive ${className}`}
    >
      {error}
    </p>
  );
}

interface FieldErrorProps {
  state?: ErrorState;
  field: string;
  className?: string;
}

export function FieldError({ state, field, className = "" }: FieldErrorProps) {
  if (!state?.errors) return null;

  const error = state.errors[field];
  if (!error) return null;

  if (Array.isArray(error)) {
    return (
      <div className={`text-sm text-destructive ${className}`}>
        {error.map((err, index) => (
          <p key={index} data-testid={`field-error-${field}-${index}`}>
            {err}
          </p>
        ))}
      </div>
    );
  }

  return (
    <p
      data-testid={`field-error-${field}`}
      className={`text-sm text-destructive ${className}`}
    >
      {error}
    </p>
  );
}
