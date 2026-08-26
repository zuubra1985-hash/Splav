import React, { useState } from 'react';
import { RiverRoute, VesselType, RouteSuitabilityQuery } from '../types';
import { evaluateRouteSuitability } from '../utils/routeSuitability';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X, 
  ChevronRight, 
  ArrowLeft, 
  Sparkles, 
  Compass, 
  ShieldCheck,
  Calendar,
  Users
} from 'lucide-react';

interface RouteSuitabilityModalProps {
  route: RiverRoute;
  onClose: () => void;
  onCreateMyTrip: (route: RiverRoute) => void;
  onFindCompanions: (route: RiverRoute) => void;
}

export const RouteSuitabilityModal: React.FC<RouteSuitabilityModalProps> = ({
  route,
  onClose,
  onCreateMyTrip,
  onFindCompanions
}) => {
  const [step, setStep] = useState<number>(1);
  const [query, setQuery] = useState<RouteSuitabilityQuery>({
    experience: 'basic',
    vessel: (route.recommendedVessels && route.recommendedVessels[0]) || 'kayak',
    autonomyDays: route.durationDays <= 2 ? '1-2' : route.durationDays <= 5 ? '3-5' : '5+',
    readinessForHarshConditions: 'medium'
  });

  const [result, setResult] = useState<ReturnType<typeof evaluateRouteSuitability> | null>(null);

  const handleCalculate = () => {
    const res = evaluateRouteSuitability(route, query);
    setResult(res);
    setStep(5); // Result step
  };

  return (
    <div className="fixed inset-0 z-[2600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5E0D8] rounded-[24px] max-w-lg w-full shadow-2xl overflow-hidden my-auto text-[#2D332D]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#EEEBE6] flex items-center justify-between bg-[#F9F7F4]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2D5A27] text-white flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1A1F1A]">Подходит ли мне маршрут?</h2>
              <p className="text-[11px] text-[#6B665F] truncate max-w-xs">{route.name} ({route.fstrCategory})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#EAE7E2] text-[#6B665F] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Steps Content */}
        <div className="p-5 sm:p-6 space-y-5">

          {/* Progress bar */}
          {step < 5 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-[#8B7E6D]">
                <span>Шаг {step} из 4</span>
                <span>{step === 1 ? 'Опыт' : step === 2 ? 'Плавсредство' : step === 3 ? 'Автономность' : 'Условия'}</span>
              </div>
              <div className="h-1.5 w-full bg-[#EEEBE6] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#2D5A27] transition-all duration-300 rounded-full"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 1: Experience */}
          {step === 1 && (
            <div className="space-y-3.5">
              <h3 className="text-sm font-bold text-[#1A1F1A]">
                1. Какой у вас опыт водных сплавов?
              </h3>
              <div className="space-y-2">
                {[
                  { id: 'none', title: 'Нет опыта', desc: 'Первый раз на воде или только короткие дневные прогулки' },
                  { id: 'basic', title: 'Есть базовый опыт', desc: '1-3 некатегорийных сплава, уверенно держу весло и управляю лодкой' },
                  { id: 'experienced', title: 'Опытный водник', desc: '5+ сплавов, опыт бурной воды (II-IV к.с.), чтение порогов и спасработы' }
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      query.experience === opt.id
                        ? 'border-[#2D5A27] bg-[#E8F1E7]/50 ring-1 ring-[#2D5A27]'
                        : 'border-[#E5E0D8] hover:bg-[#F9F7F4]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="experience"
                      checked={query.experience === opt.id}
                      onChange={() => setQuery({ ...query, experience: opt.id as any })}
                      className="mt-0.5 accent-[#2D5A27]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#1A1F1A]">{opt.title}</div>
                      <div className="text-[11px] text-[#6B665F] mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Vessel */}
          {step === 2 && (
            <div className="space-y-3.5">
              <h3 className="text-sm font-bold text-[#1A1F1A]">
                2. На каком плавсредстве планируете идти?
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'kayak', icon: '🛶', title: 'Байдарка / Каяк' },
                  { id: 'catamaran', icon: '⛵', title: 'Катамаран' },
                  { id: 'sup', icon: '🏄‍♂️', title: 'SUP-борд' },
                  { id: 'raft', icon: '🚣', title: 'Рафт' },
                  { id: 'packraft', icon: '🎒', title: 'Пакрафт' },
                  { id: 'motorboat', icon: '🚤', title: 'Моторная лодка' }
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      query.vessel === opt.id
                        ? 'border-[#2D5A27] bg-[#E8F1E7]/50 ring-1 ring-[#2D5A27]'
                        : 'border-[#E5E0D8] hover:bg-[#F9F7F4]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vessel"
                      checked={query.vessel === opt.id}
                      onChange={() => setQuery({ ...query, vessel: opt.id as any })}
                      className="accent-[#2D5A27]"
                    />
                    <span className="text-base">{opt.icon}</span>
                    <span className="text-xs font-bold text-[#1A1F1A]">{opt.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Autonomy */}
          {step === 3 && (
            <div className="space-y-3.5">
              <h3 className="text-sm font-bold text-[#1A1F1A]">
                3. Какая продолжительность автономного сплава вам комфортна?
              </h3>
              <div className="space-y-2">
                {[
                  { id: '1-2', title: '1–2 дня (ПВД / Выходные)', desc: 'Минимум снаряжения, близость к цивилизации' },
                  { id: '3-5', title: '3–5 дней (Классический маршрут)', desc: 'Полная автономность, запас провизии, бивачное снаряжение' },
                  { id: '5+', title: '5+ дней (Экспедиция)', desc: 'Глубокая тайга/тундра, полное самообеспечение' }
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      query.autonomyDays === opt.id
                        ? 'border-[#2D5A27] bg-[#E8F1E7]/50 ring-1 ring-[#2D5A27]'
                        : 'border-[#E5E0D8] hover:bg-[#F9F7F4]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="autonomy"
                      checked={query.autonomyDays === opt.id}
                      onChange={() => setQuery({ ...query, autonomyDays: opt.id as any })}
                      className="mt-0.5 accent-[#2D5A27]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#1A1F1A]">{opt.title}</div>
                      <div className="text-[11px] text-[#6B665F] mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Harsh Conditions */}
          {step === 4 && (
            <div className="space-y-3.5">
              <h3 className="text-sm font-bold text-[#1A1F1A]">
                4. Готовность к северным условиям (холодная вода, мошка, непогода)?
              </h3>
              <div className="space-y-2">
                {[
                  { id: 'low', title: 'Низкая (Предпочитаю тепло и комфорт)', desc: 'Не готов к затяжным дождям, холодной воде (+6°C) и гнусу' },
                  { id: 'medium', title: 'Средняя (Есть базовое снаряжение)', desc: 'Есть неопрен/мембрана, накомарник, готов к капризам северного лета' },
                  { id: 'high', title: 'Высокая (Экспедиционная закалка)', desc: 'Полный комплект спецснаряжения, опыт ночевок при околонулевых температурах' }
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      query.readinessForHarshConditions === opt.id
                        ? 'border-[#2D5A27] bg-[#E8F1E7]/50 ring-1 ring-[#2D5A27]'
                        : 'border-[#E5E0D8] hover:bg-[#F9F7F4]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="harsh"
                      checked={query.readinessForHarshConditions === opt.id}
                      onChange={() => setQuery({ ...query, readinessForHarshConditions: opt.id as any })}
                      className="mt-0.5 accent-[#2D5A27]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#1A1F1A]">{opt.title}</div>
                      <div className="text-[11px] text-[#6B665F] mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: RESULT VIEW */}
          {step === 5 && result && (
            <div className="space-y-4">
              
              {/* Outcome Banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                result.isSuitable 
                  ? 'bg-[#E8F1E7] border-[#CDE0CC] text-[#2D5A27]' 
                  : 'bg-[#FDF2F2] border-[#F8B4B4] text-[#E54B4B]'
              }`}>
                {result.isSuitable ? (
                  <CheckCircle2 className="w-7 h-7 shrink-0 text-[#2D5A27]" />
                ) : (
                  <AlertTriangle className="w-7 h-7 shrink-0 text-[#E54B4B]" />
                )}
                <div>
                  <h3 className="text-base font-black">
                    {result.title}
                  </h3>
                  <p className="text-xs mt-0.5 text-[#2D332D]">
                    Индекс соответствия требованиям маршрута: <strong>{result.score}%</strong>
                  </p>
                </div>
              </div>

              {/* Breakdown List */}
              <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] space-y-2.5">
                <div className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wide">
                  Оценка параметров:
                </div>
                <div className="space-y-2 text-xs">
                  {result.reasons.map((r, idx) => (
                    <div key={`reason-${idx}`} className="flex items-start gap-2">
                      {r.type === 'success' && <span className="text-[#2D5A27] font-bold">✓</span>}
                      {r.type === 'warning' && <span className="text-[#D97706] font-bold">⚠️</span>}
                      {r.type === 'error' && <span className="text-[#E54B4B] font-bold">✕</span>}
                      <span className={r.type === 'error' ? 'text-[#7F1D1D] font-medium' : 'text-[#2D332D]'}>
                        {r.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations if any */}
              {result.recommendations.length > 0 && (
                <div className="bg-white p-3.5 rounded-xl border border-[#E5E0D8] space-y-1.5">
                  <div className="text-[11px] font-bold text-[#8B7E6D] uppercase">
                    Рекомендации:
                  </div>
                  <ul className="text-xs text-[#4A443E] space-y-1">
                    {result.recommendations.map((rec, idx) => (
                      <li key={`rec-${idx}`} className="flex items-start gap-1.5">
                        <span className="text-[#2D5A27]">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Navigation Footer */}
        <div className="p-4 sm:p-5 border-t border-[#EEEBE6] bg-[#F9F7F4] flex items-center justify-between gap-3">
          {step > 1 && step < 5 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6B665F] hover:bg-[#EAE7E2] transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Назад
            </button>
          ) : step === 5 ? (
            <button
              onClick={() => setStep(1)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6B665F] hover:bg-[#EAE7E2] transition-colors"
            >
              Пройти заново
            </button>
          ) : (
            <div />
          )}

          {step < 4 && (
            <button
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Далее</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 4 && (
            <button
              onClick={handleCalculate}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Показать результат</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 5 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onFindCompanions(route);
                }}
                className="px-3.5 py-2 bg-white text-[#2D332D] border border-[#E5E0D8] hover:border-[#2D5A27] text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Users className="w-3.5 h-3.5 text-[#2D5A27]" />
                <span>Попутчики</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onCreateMyTrip(route);
                }}
                className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Подготовить сплав</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
