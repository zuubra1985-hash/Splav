import { RiverRoute, RouteSuitabilityQuery, RouteSuitabilityResult } from '../types';

export function evaluateRouteSuitability(
  route: RiverRoute,
  query: RouteSuitabilityQuery
): RouteSuitabilityResult {
  const reasons: { type: 'success' | 'warning' | 'error'; text: string }[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // 1. Check Category & Experience
  const categoryStr = route.fstrCategory || '';
  const isHighCategory = /III|IV|V|3|4|5/i.test(categoryStr);
  const isMidCategory = /II|2/i.test(categoryStr);

  if (query.experience === 'none') {
    if (isHighCategory) {
      score -= 50;
      reasons.push({
        type: 'error',
        text: `Маршрут имеет высокую категорию сложности (${route.fstrCategory}), прохождение без опыта опасно для жизни.`
      });
      recommendations.push('Начните с некатегорийных рек (0 или I к.с.) или пройдите обучение в турклубе.');
    } else if (isMidCategory) {
      score -= 30;
      reasons.push({
        type: 'warning',
        text: `Маршрут II к.с. требует базовых навыков гребли, чтения воды и спасработ.`
      });
      recommendations.push('Рекомендуется участие в группе с опытным руководителем или инструктором-проводником.');
    } else {
      reasons.push({
        type: 'success',
        text: 'Категория сложности подходит для начинающих туристов.'
      });
    }
  } else if (query.experience === 'basic') {
    if (isHighCategory) {
      score -= 35;
      reasons.push({
        type: 'warning',
        text: `Маршрут ${route.fstrCategory} требует опыта 3+ походов на бурной воде.`
      });
      recommendations.push('Необходим сертифицированный капитан и страховка с берега на ключевых порогах.');
    } else {
      reasons.push({
        type: 'success',
        text: 'Ваш опыт полностью соответствует сложности водного маршрута.'
      });
    }
  } else {
    reasons.push({
      type: 'success',
      text: 'Ваш опыт достаточен для уверенного прохождения маршрута любой сложности.'
    });
  }

  // 2. Check Vessel
  const recommendedVessels = route.recommendedVessels || [];
  if (recommendedVessels.length > 0) {
    if (recommendedVessels.includes(query.vessel)) {
      reasons.push({
        type: 'success',
        text: 'Выбранное плавсредство рекомендовано в паспорте реки.'
      });
    } else {
      if (query.vessel === 'sup' && (isMidCategory || isHighCategory)) {
        score -= 40;
        reasons.push({
          type: 'error',
          text: 'SUP-борд не рекомендуется для каменистых порогов и шивер с сильным прижимом.'
        });
        recommendations.push('Используйте каркасно-надувную байдарку или катамаран с коленной посадкой.');
      } else {
        score -= 15;
        reasons.push({
          type: 'warning',
          text: `Плавсредство не входит в основной список рекомендаций (${recommendedVessels.join(', ')}).`
        });
      }
    }
  }

  // 3. Autonomy & Duration
  const days = route.durationDays || 1;
  if (query.autonomyDays === '1-2' && days > 2) {
    score -= 30;
    reasons.push({
      type: 'error',
      text: `Продолжительность сплава ${days} дн. превышает вашу комфортную автономность.`
    });
    recommendations.push('Спланируйте радиальные стоянки, подготовьте запас провизии и фильтрации воды.');
  } else if (query.autonomyDays === '3-5' && days > 5) {
    score -= 20;
    reasons.push({
      type: 'warning',
      text: `Маршрут рассчитан на ${days} дней в условиях северной тайги/тундры.`
    });
  } else {
    reasons.push({
      type: 'success',
      text: `Продолжительность (${days} дн.) отлично укладывается в ваши рамки автономности.`
    });
  }

  // 4. Harsh Northern Conditions
  const isNorthern = route.region === 'ЯНАО' || /Полярный|Урал|Северная/i.test(route.name);
  if (isNorthern && query.readinessForHarshConditions === 'low') {
    score -= 25;
    reasons.push({
      type: 'error',
      text: 'В регионе возможны резкие перепады температур, заморозки, шквалистый ветер и мошка.'
    });
    recommendations.push('Обязательны неопреновый/сухой гидрокостюм, ветроустойчивая палатка и спутниковый трекер.');
  } else if (isNorthern && query.readinessForHarshConditions === 'medium') {
    score -= 10;
    reasons.push({
      type: 'warning',
      text: 'Требуется серьезное экспедиционное снаряжение для приполярного климата.'
    });
  } else {
    reasons.push({
      type: 'success',
      text: 'Готовность к погодным факторам соответствует условиям региона.'
    });
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const isSuitable = finalScore >= 65;

  return {
    isSuitable,
    score: finalScore,
    title: isSuitable ? 'Маршрут вам подходит' : 'Маршрут не рекомендуется',
    reasons,
    recommendations
  };
}
