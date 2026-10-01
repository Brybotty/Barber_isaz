import { celularInternacional, esCelularValido, formatoCelular, limpiarCelular } from './colombia';

describe('celulares de Colombia', () => {
  it('limpia espacios, guiones y el indicativo', () => {
    expect(limpiarCelular('300 123-4567')).toBe('3001234567');
    expect(limpiarCelular('+57 300 123 4567')).toBe('3001234567');
  });

  it('valida 10 dígitos que empiezan por 3', () => {
    expect(esCelularValido('300 123 4567')).toBeTrue();
    expect(esCelularValido('+573001234567')).toBeTrue();
    expect(esCelularValido('6021234567')).toBeFalse();
    expect(esCelularValido('30012345')).toBeFalse();
  });

  it('arma el número internacional para el SMS', () => {
    expect(celularInternacional('300 123 4567')).toBe('+573001234567');
    expect(celularInternacional('+57 300-123-4567')).toBe('+573001234567');
  });

  it('muestra el celular de la cuenta en grupos', () => {
    expect(formatoCelular('+573001234567')).toBe('300 123 4567');
    expect(formatoCelular('3001234567')).toBe('300 123 4567');
    expect(formatoCelular('+14155550100')).toBe('+14155550100');
  });
});
