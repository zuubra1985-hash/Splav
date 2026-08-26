import React, { useState, useMemo } from 'react';
import { RiverRoute, Article, TravelNote, FaqDataConfig, AppUser, CompanionTrip } from '../types';
import { INITIAL_FAQ_DATA } from '../data/faqData';
import { 
  BookOpen, 
  FileText, 
  Compass, 
  MapPin, 
  HelpCircle, 
  LifeBuoy, 
  Search, 
  Filter, 
  ChevronRight, 
  Eye, 
  Calendar, 
  User, 
  CheckCircle2, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';

interface KnowledgeBaseModuleProps {
  articles: Article[];
  travelNotes: TravelNote[];
  routes: RiverRoute[];
  trips?: CompanionTrip[];
  faqData?: FaqDataConfig;
  currentUser?: AppUser | null;
  onOpenArticleDetails?: (article: Article) => void;
  onOpenRouteDetails?: (route: RiverRoute) => void;
  onOpenTravelNotes?: () => void;
}

export const KnowledgeBaseModule: React.FC<KnowledgeBaseModuleProps> = ({
  articles,
  travelNotes,
  routes,
  trips = [],
  faqData = INITIAL_FAQ_DATA,
  currentUser,
  onOpenArticleDetails,
  onOpenRouteDetails,
  onOpenTravelNotes
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'articles' | 'reports' | 'pilot_guides' | 'notes' | 'safety' | 'faq'>('all');
  const [selectedRegion, setSelectedRegion] = useState<'ALL' | 'ХМАО' | 'ЯНАО'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Filtered Articles / Reports / Pilot Guides
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesSearch = !searchQuery || 
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        art.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRegion = selectedRegion === 'ALL' || art.region === selectedRegion;

      if (activeTab === 'articles') {
        return matchesSearch && matchesRegion && (!art.tags || !art.tags.includes('отчет') && !art.tags.includes('лоция'));
      }
      if (activeTab === 'reports') {
        return matchesSearch && matchesRegion && (art.tags?.includes('отчет') || art.tags?.includes('экспедиция') || art.title.toLowerCase().includes('отчет'));
      }
      if (activeTab === 'pilot_guides') {
        return matchesSearch && matchesRegion && (art.tags?.includes('лоция') || art.title.toLowerCase().includes('лоция') || art.title.toLowerCase().includes('описание реки'));
      }

      return matchesSearch && matchesRegion;
    });
  }, [articles, searchQuery, selectedRegion, activeTab]);

  // Filtered Travel Notes
  const filteredNotes = useMemo(() => {
    return travelNotes.filter((note) => {
      const matchesSearch = !searchQuery || 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.locationName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRegion = selectedRegion === 'ALL' || note.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [travelNotes, searchQuery, selectedRegion]);

  // Filtered FAQ Items
  const filteredFaq = useMemo(() => {
    const questions = faqData.faqQuestions || [];
    return questions.filter((q) => {
      return !searchQuery || 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        q.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.category.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [faqData.faqQuestions, searchQuery]);

  // Filtered Safety Guides
  const filteredSafety = useMemo(() => {
    const guides = faqData.safetyGuides || [];
    return guides.filter((g) => {
      return !searchQuery || 
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        g.shortSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.rules.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [faqData.safetyGuides, searchQuery]);

  // Global multi-entity search results if query is active
  const globalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();

    const matchedRoutes = routes.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.riverName.toLowerCase().includes(q) || 
      r.startPoint.name.toLowerCase().includes(q) ||
      r.endPoint.name.toLowerCase().includes(q)
    );

    const matchedTrips = trips.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.riverName.toLowerCase().includes(q)
    );

    return {
      routes: matchedRoutes,
      trips: matchedTrips,
      articles: filteredArticles,
      notes: filteredNotes,
      faq: filteredFaq
    };
  }, [searchQuery, routes, trips, filteredArticles, filteredNotes, filteredFaq]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6 text-[#2D332D]">
      
      {/* Module Title & Search Header */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
            Энциклопедия водного туризма
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A] mt-1">
            База знаний
          </h1>
          <p className="text-xs sm:text-sm text-[#6B665F]">
            Статьи, технические отчёты, лоции рек ХМАО и ЯНАО, путевые заметки и ответы на вопросы
          </p>
        </div>

        {/* Unified Search & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B7E6D]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по рекам, маршрутам, статьям, отчетам и лоциям..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white focus:outline-hidden focus:border-[#2D5A27]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8B7E6D] font-bold">Регион:</span>
            <div className="flex items-center gap-1">
              {(['ALL', 'ХМАО', 'ЯНАО'] as const).map((reg) => (
                <button
                  key={reg}
                  onClick={() => setSelectedRegion(reg)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedRegion === reg
                      ? 'bg-[#2D5A27] text-white shadow-2xs'
                      : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                  }`}
                >
                  {reg === 'ALL' ? 'Все' : reg}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-[#EEEBE6] pt-3">
          {[
            { id: 'all', label: 'Все материалы', count: articles.length + travelNotes.length },
            { id: 'articles', label: 'Статьи и гайды', count: articles.length },
            { id: 'reports', label: 'Технические отчёты', count: articles.filter(a => a.tags?.includes('отчет')).length },
            { id: 'pilot_guides', label: 'Лоции рек', count: articles.filter(a => a.tags?.includes('лоция')).length },
            { id: 'notes', label: 'Путевые заметки', count: travelNotes.length },
            { id: 'safety', label: 'Безопасность', count: faqData.safetyGuides?.length || 0 },
            { id: 'faq', label: 'Вопросы и ответы (FAQ)', count: faqData.faqQuestions?.length || 0 }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#2D5A27] text-white shadow-2xs'
                    : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#E5E0D8] text-[#2D332D]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* GLOBAL SEARCH RESULTS (If user is typing in unified search) */}
      {globalSearchResults && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider">
            Результаты поиска по запросу «{searchQuery}»:
          </div>

          {/* Matched Routes */}
          {globalSearchResults.routes.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] space-y-2">
              <h3 className="text-xs font-black text-[#2D5A27] uppercase">Найденные маршруты ({globalSearchResults.routes.length}):</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {globalSearchResults.routes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => onOpenRouteDetails && onOpenRouteDetails(r)}
                    className="p-3 rounded-xl bg-[#F9F7F4] hover:bg-[#E8F1E7] border border-[#EEEBE6] cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#1A1F1A]">{r.name}</div>
                      <div className="text-[11px] text-[#6B665F]">{r.region} • {r.lengthKm} км • {r.fstrCategory}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#2D5A27]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Articles */}
          {globalSearchResults.articles.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] space-y-2">
              <h3 className="text-xs font-black text-[#2D5A27] uppercase">Найденные статьи и отчёты ({globalSearchResults.articles.length}):</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {globalSearchResults.articles.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => {
                      if (onOpenArticleDetails) onOpenArticleDetails(art);
                      else setSelectedArticle(art);
                    }}
                    className="p-3 rounded-xl bg-[#F9F7F4] hover:bg-[#E8F1E7] border border-[#EEEBE6] cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#1A1F1A]">{art.title}</div>
                      <div className="text-[11px] text-[#6B665F]">{art.author} • {art.date}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#2D5A27]" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MAIN CONTENT BASED ON TABS */}
      {!searchQuery && (
        <div className="space-y-6">

          {/* ARTICLES / REPORTS / PILOT GUIDES GRID */}
          {(activeTab === 'all' || activeTab === 'articles' || activeTab === 'reports' || activeTab === 'pilot_guides') && (
            <div className="space-y-3">
              {activeTab === 'all' && (
                <h2 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider">
                  Статьи, лоции и отчёты ({filteredArticles.length})
                </h2>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => {
                      if (onOpenArticleDetails) onOpenArticleDetails(article);
                      else setSelectedArticle(article);
                    }}
                    className="bg-white rounded-2xl border border-[#E5E0D8] hover:border-[#2D5A27] overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                  >
                    <div className="relative h-40 w-full overflow-hidden bg-[#EAE7E2]">
                      <img
                        src={article.coverImage}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {article.region && (
                        <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur-md">
                          {article.region}
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {article.tags?.map((t, idx) => (
                            <span key={idx} className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#E8F1E7] text-[#2D5A27]">
                              {t}
                            </span>
                          ))}
                        </div>
                        <h3 className="text-sm font-bold text-[#1A1F1A] line-clamp-2 group-hover:text-[#2D5A27] transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-xs text-[#6B665F] line-clamp-2">
                          {article.summary || article.content.slice(0, 100)}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#EEEBE6] flex items-center justify-between text-[11px] text-[#8B7E6D]">
                        <span className="truncate">{article.author}</span>
                        <span>{article.readTimeMinutes || 5} мин</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TRAVEL NOTES */}
          {(activeTab === 'all' || activeTab === 'notes') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider">
                  Путевые заметки и наблюдения ({filteredNotes.length})
                </h2>
                {onOpenTravelNotes && (
                  <button
                    onClick={onOpenTravelNotes}
                    className="text-xs font-bold text-[#2D5A27] hover:underline flex items-center gap-1"
                  >
                    <span>Все заметки на карте</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white p-4 rounded-2xl border border-[#E5E0D8] space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F1E7] text-[#2D5A27]">
                        {note.region} • {note.locationName}
                      </span>
                      <span className="text-[10px] text-[#8B7E6D]">{note.date}</span>
                    </div>

                    <h4 className="text-xs font-bold text-[#1A1F1A]">{note.title}</h4>
                    <p className="text-xs text-[#4A443E] line-clamp-3 leading-relaxed">{note.content}</p>

                    <div className="pt-2 border-t border-[#EEEBE6] text-[11px] text-[#8B7E6D] flex items-center justify-between">
                      <span>Автор: {note.authorName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ (ВОПРОСЫ И ОТВЕТЫ) */}
          {(activeTab === 'all' || activeTab === 'faq') && (
            <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[#1A1F1A]">
                    Вопросы и ответы (FAQ)
                  </h2>
                  <p className="text-xs text-[#6B665F]">Ответы на частые вопросы по организации водных походов</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredFaq.map((q) => {
                  const isExpanded = expandedFaqId === q.id;
                  return (
                    <div
                      key={q.id}
                      className="border border-[#EEEBE6] rounded-2xl overflow-hidden bg-[#F9F7F4] transition-all"
                    >
                      <button
                        onClick={() => setExpandedFaqId(isExpanded ? null : q.id)}
                        className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-[#1A1F1A] hover:bg-[#EAE7E2] transition-colors"
                      >
                        <span>{q.question}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#2D5A27] shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#8B7E6D] shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-4 pt-0 text-xs sm:text-sm text-[#4A443E] leading-relaxed border-t border-[#EEEBE6] bg-white">
                          <p className="whitespace-pre-line">{q.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Article Detail Reader Modal if selected directly */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[2800] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-[#EEEBE6] pb-3">
              <span className="text-xs font-bold text-[#2D5A27] uppercase">{selectedArticle.region}</span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-3 py-1.5 rounded-xl bg-[#F9F7F4] text-xs font-bold text-[#6B665F] hover:bg-[#EAE7E2]"
              >
                Закрыть
              </button>
            </div>

            <h2 className="text-xl font-black text-[#1A1F1A]">{selectedArticle.title}</h2>
            <div className="text-xs text-[#8B7E6D]">Автор: {selectedArticle.author} • {selectedArticle.date}</div>

            <div className="text-xs sm:text-sm text-[#2D332D] leading-relaxed whitespace-pre-line pt-2">
              {selectedArticle.content}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
