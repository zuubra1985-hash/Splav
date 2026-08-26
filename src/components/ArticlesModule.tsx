import React, { useState } from 'react';
import { ArticleReport, Region, AppUser } from '../types';
import { BookOpen, Calendar, Clock, User, Compass, Tag, ChevronRight, X, Image as ImageIcon, Award, Plus, Edit3 } from 'lucide-react';

interface ArticlesModuleProps {
  articles: ArticleReport[];
  selectedRegion: Region;
  currentUser?: AppUser | null;
  onOpenArticleEditor?: (article?: ArticleReport) => void;
}

export const ArticlesModule: React.FC<ArticlesModuleProps> = ({
  articles,
  selectedRegion,
  currentUser,
  onOpenArticleEditor
}) => {
  const [selectedArticle, setSelectedArticle] = useState<ArticleReport | null>(null);

  const isAdmin = currentUser?.role === 'superadmin' || 
                  currentUser?.role === 'admin';

  const filteredArticles = articles.filter((a) => {
    if (selectedRegion !== 'ALL' && a.region !== selectedRegion) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[24px] border border-[#E5E0D8] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E8F1E7] text-[#2D5A27]">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A]">
              Статьи и отчеты об экспедициях
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6B665F] mt-1">
            Авторские описания водных маршрутов, фотоотчеты, рекомендации по снаряжению и порогам Севера.
          </p>
        </div>

        {isAdmin && onOpenArticleEditor && (
          <button
            onClick={() => onOpenArticleEditor()}
            className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Написать статью / отчет</span>
          </button>
        )}
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-12 text-center shadow-sm space-y-4 my-6">
          <div className="w-16 h-16 rounded-2xl bg-[#F9F7F4] border border-[#E5E0D8] flex items-center justify-center mx-auto text-[#8B7E6D]">
            <BookOpen className="w-8 h-8 opacity-60 text-[#2D5A27]" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-[#1A1F1A]">В данном разделе пока нет статей</h3>
            <p className="text-xs text-[#6B665F] leading-relaxed">
              Раздел готов к наполнению авторскими отчетами, лоциями и описаниями водных маршрутов.
            </p>
          </div>
          {isAdmin && onOpenArticleEditor && (
            <div className="pt-2">
              <button
                onClick={() => onOpenArticleEditor()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Написать первую статью</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((art) => (
            <div
              key={art.id}
              onClick={() => setSelectedArticle(art)}
              className="bg-white border border-[#E5E0D8] rounded-[28px] overflow-hidden shadow-sm flex flex-col justify-between hover:border-[#D9D1C5] hover:shadow-md cursor-pointer transition-all group"
            >
              {/* Cover Image */}
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={art.coverImage}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-white/95 text-[#2D5A27] shadow-sm backdrop-blur-md">
                    {art.region} • р. {art.riverName}
                  </span>
                </div>
              </div>

              {/* Article Content Preview */}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-[11px] text-[#8B7E6D] mb-1.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#2D5A27]" />
                      {art.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#8B7E6D]" />
                      {art.readTimeMin} мин чтения
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#1A1F1A] leading-snug group-hover:text-[#2D5A27] transition-colors">
                    {art.title}
                  </h3>

                  <p className="text-xs text-[#6B665F] line-clamp-2 mt-2 leading-relaxed">
                    {art.summary}
                  </p>
                </div>

                {/* Author & Read More */}
                <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#E8F1E7] border border-[#CDE0CC] flex items-center justify-center text-[10px] font-bold text-[#2D5A27]">
                      {art.author.slice(0, 1)}
                    </div>
                    <span className="text-xs text-[#2D332D] font-medium truncate max-w-[110px] sm:max-w-[130px]">{art.author}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && onOpenArticleEditor && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenArticleEditor(art);
                        }}
                        className="p-1.5 bg-[#E8F1E7] hover:bg-[#D4E7D3] text-[#2D5A27] rounded-lg transition-colors"
                        title="Редактировать статью"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <span className="text-xs font-bold text-[#2D5A27] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Читать
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

              </div>

            </div>
          ))}
        </div>
      )}

      {/* Full Article Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[2800] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-auto text-[#2D332D]">
            
            {/* Header image */}
            <div className="relative h-60 w-full shrink-0 overflow-hidden rounded-t-[28px]">
              <img
                src={selectedArticle.coverImage}
                alt={selectedArticle.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              
              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-4 right-4 space-y-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#2D5A27] text-white">
                  {selectedArticle.region} • {selectedArticle.riverName}
                </span>
                <h1 className="text-lg sm:text-2xl font-extrabold text-white leading-tight">
                  {selectedArticle.title}
                </h1>
              </div>
            </div>

            {/* Article Body */}
            <div className="p-6 sm:p-8 space-y-6 flex-1 text-[#2D332D]">
              
              {/* Author bar */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D8] text-xs text-[#8B7E6D]">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#D97706]" />
                  <span className="text-[#1A1F1A] font-bold">{selectedArticle.author}</span>
                  <span className="text-[#8B7E6D]">({selectedArticle.authorRank})</span>
                </div>
                <span>{selectedArticle.date}</span>
              </div>

              {/* Stats Strip if available */}
              {selectedArticle.stats.distanceKm > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] text-center text-xs">
                  <div>
                    <span className="text-[10px] text-[#8B7E6D] block font-medium">Дистанция</span>
                    <strong className="text-[#1A1F1A] font-bold">{selectedArticle.stats.distanceKm} км</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B7E6D] block font-medium">Длительность</span>
                    <strong className="text-[#1A1F1A] font-bold">{selectedArticle.stats.days} дней</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B7E6D] block font-medium">Плавсредство</span>
                    <strong className="text-[#2D5A27] font-bold truncate block">{selectedArticle.stats.vessel}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B7E6D] block font-medium">Лучший сезон</span>
                    <strong className="text-[#1A1F1A] font-bold">{selectedArticle.stats.bestMonth}</strong>
                  </div>
                </div>
              )}

              {/* Text Paragraphs */}
              <div className="space-y-4 text-xs sm:text-sm text-[#4A443E] leading-relaxed">
                {selectedArticle.fullContent.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              {/* Photo gallery */}
              {selectedArticle.gallery.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-[#E5E0D8]">
                  <h4 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#2D5A27]" />
                    Фотографии с маршрута
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedArticle.gallery.map((img, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden bg-[#F9F7F4] border border-[#EEEBE6]">
                        <img src={img.url} alt={img.caption} className="w-full h-44 object-cover" />
                        <p className="p-2.5 text-[11px] text-[#6B665F] italic text-center">
                          {img.caption}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal footer */}
            <div className="p-4 bg-[#F9F7F4] border-t border-[#E5E0D8] rounded-b-[28px] flex items-center justify-between">
              <div>
                {isAdmin && onOpenArticleEditor && (
                  <button
                    onClick={() => {
                      const art = selectedArticle;
                      setSelectedArticle(null);
                      onOpenArticleEditor(art);
                    }}
                    className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Редактировать статью</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2.5 bg-white hover:bg-[#EAE7E2] text-[#2D332D] font-bold text-xs rounded-xl border border-[#E5E0D8]"
              >
                Закрыть статью
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
