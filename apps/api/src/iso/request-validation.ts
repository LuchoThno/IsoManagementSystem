import { BadRequestException } from '@nestjs/common';

export const ensureNonEmptyString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`El campo "${field}" es obligatorio.`);
  }
};

export const ensureOptionalString = (value: unknown, field: string) => {
  if (value !== undefined && (typeof value !== 'string' || !value.trim())) {
    throw new BadRequestException(`El campo "${field}" debe ser un texto válido.`);
  }
};

export const ensureEnumValue = <T extends string>(
  value: unknown,
  field: string,
  allowedValues: readonly T[]
) => {
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new BadRequestException(
      `El campo "${field}" debe ser uno de: ${allowedValues.join(', ')}.`
    );
  }
};

export const ensureOptionalEnumValue = <T extends string>(
  value: unknown,
  field: string,
  allowedValues: readonly T[]
) => {
  if (value !== undefined) {
    ensureEnumValue(value, field, allowedValues);
  }
};

export const ensureIsoDateString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
    throw new BadRequestException(`El campo "${field}" debe ser una fecha válida.`);
  }
};

export const ensureOptionalIsoDateString = (value: unknown, field: string) => {
  if (value !== undefined) {
    ensureIsoDateString(value, field);
  }
};

export const ensureStringArray = (value: unknown, field: string) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new BadRequestException(`El campo "${field}" debe ser un arreglo de textos.`);
  }
};

export const ensureArray = (value: unknown, field: string) => {
  if (!Array.isArray(value)) {
    throw new BadRequestException(`El campo "${field}" debe ser un arreglo.`);
  }
};

export const ensureBoolean = (value: unknown, field: string) => {
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`El campo "${field}" debe ser booleano.`);
  }
};

export const ensureOptionalBoolean = (value: unknown, field: string) => {
  if (value !== undefined) {
    ensureBoolean(value, field);
  }
};

export const ensureObject = (value: unknown, field: string) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`El campo "${field}" debe ser un objeto válido.`);
  }
};

export const ensureRecordOfBooleans = (value: unknown, field: string) => {
  ensureObject(value, field);

  const typedValue = value as Record<string, unknown>;

  for (const [entryKey, entryValue] of Object.entries(typedValue)) {
    ensureBoolean(entryValue, `${field}.${entryKey}`);
  }
};

export const ensureIntegerInRange = (
  value: unknown,
  field: string,
  { min, max }: { min: number; max: number }
) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new BadRequestException(
      `El campo "${field}" debe ser un entero entre ${min} y ${max}.`
    );
  }
};

export const ensureEmailString = (value: unknown, field: string) => {
  ensureNonEmptyString(value, field);

  const normalized = String(value).trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalized)) {
    throw new BadRequestException(`El campo "${field}" debe ser un correo válido.`);
  }
};

export const ensureOptionalEmailString = (value: unknown, field: string) => {
  if (value !== undefined && value !== '') {
    ensureEmailString(value, field);
  }
};
