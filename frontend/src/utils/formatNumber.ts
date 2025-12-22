/**
 * Форматирует число для отображения на графиках
 * Использует разделители тысяч, сокращения (K, M) и научную нотацию для больших чисел
 * @param value - Число для форматирования
 * @param unit - Единица измерения (опционально)
 * @returns Отформатированная строка с числом и единицей измерения
 */
export function formatNumber(value: number, unit?: string): string {
  const absValue = Math.abs(value);
  
  // Обработка нуля
  if (value === 0) {
    return unit ? `0 ${unit}` : '0';
  }

  // Обработка очень маленьких чисел (близких к нулю)
  if (absValue < 0.0001) {
    const formatted = value.toExponential(2);
    return unit ? `${formatted} ${unit}` : formatted;
  }

  // Для чисел от -1000 до 1000 используем обычное форматирование
  if (absValue < 1000) {
    let formatted: string;
    // Для целых чисел не показываем десятичную часть
    if (Number.isInteger(value)) {
      formatted = value.toString();
    } else {
      // Для дробных чисел показываем до 2 знаков после запятой
      formatted = value.toFixed(2).replace(/\.?0+$/, '');
    }
    return unit ? `${formatted} ${unit}` : formatted;
  }

  // Для чисел от 1000 до 999999 используем сокращения или разделители
  if (absValue < 1000000) {
    // Для чисел >= 10000 используем сокращение K
    if (absValue >= 10000) {
      const thousands = value / 1000;
      const formatted = thousands.toFixed(1).replace(/\.?0+$/, '');
      return unit ? `${formatted}K ${unit}` : `${formatted}K`;
    }
    // Для чисел от 1000 до 9999 используем разделители тысяч
    const formatted = value.toLocaleString('ru-RU', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
    return unit ? `${formatted} ${unit}` : formatted;
  }

  // Для очень больших чисел (>= 1e6) используем сокращения или научную нотацию
  if (absValue >= 1e9) {
    // Для миллиардов и больше используем научную нотацию
    const formatted = value.toExponential(2);
    return unit ? `${formatted} ${unit}` : formatted;
  } else if (absValue >= 1e6) {
    // Для миллионов используем сокращение M
    const millions = value / 1e6;
    const formatted = millions.toFixed(1).replace(/\.?0+$/, '');
    return unit ? `${formatted}M ${unit}` : `${formatted}M`;
  }

  // Fallback: используем разделители тысяч
  const formatted = value.toLocaleString('ru-RU', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

