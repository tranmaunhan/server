package com.aihost.expensemanager.common.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

public final class MoneyUtils {

  public static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
  private static final BigDecimal CENT = new BigDecimal("0.01");

  private MoneyUtils() {
  }

  public static BigDecimal normalize(BigDecimal value) {
    if (value == null) {
      return ZERO;
    }
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  public static List<BigDecimal> splitEqual(BigDecimal amount, int count) {
    BigDecimal normalizedAmount = normalize(amount);
    BigDecimal base = normalizedAmount.divide(BigDecimal.valueOf(count), 2, RoundingMode.DOWN);
    BigDecimal assigned = base.multiply(BigDecimal.valueOf(count));
    BigDecimal remainder = normalizedAmount.subtract(assigned);

    List<BigDecimal> shares = new ArrayList<>();
    for (int index = 0; index < count; index++) {
      shares.add(base);
    }

    int remainderSteps = remainder.movePointRight(2).intValueExact();
    for (int index = 0; index < remainderSteps; index++) {
      shares.set(index % count, shares.get(index % count).add(CENT));
    }

    return shares;
  }
}
