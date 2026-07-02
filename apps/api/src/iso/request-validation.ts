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
