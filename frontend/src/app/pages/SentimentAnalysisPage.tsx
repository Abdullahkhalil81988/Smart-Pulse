import { useEffect, useState } from "react";
import { Upload, Star, ThumbsUp, Meh, ThumbsDown, Loader2 } from "lucide-react";
import api from "../lib/api";

interface ReviewItem {
  original_text: string;
  category: string;
  ai_rating: number;
  sentiment: string;
  confidence: number;
}

interface ReviewBatch {
  _id: string;
  predictions: ReviewItem[];
  summary: any;
  createdAt: string;
}

const sentimentColors = {
  Positive: "bg-emerald-100 text-emerald-700",
  Neutral: "bg-amber-100 text-amber-700",
  Negative: "bg-red-100 text-red-700",
};

export function SentimentAnalysisPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await api.get<{ reviews: ReviewBatch[] }>("/api/reviews?limit=10");
        const allReviews = res.reviews.flatMap(batch => batch.predictions);
        setReviews(allReviews);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, []);

  const hasData = reviews.length > 0;

  // Calculate summary stats
  const avgRating = hasData ? (reviews.reduce((sum, r) => sum + r.ai_rating, 0) / reviews.length).toFixed(1) : "0.0";
  const totalProcessed = reviews.length;
  const positiveCount = reviews.filter((r) => r.sentiment === "Positive").length;
  const neutralCount = reviews.filter((r) => r.sentiment === "Neutral").length;
  const negativeCount = reviews.filter((r) => r.sentiment === "Negative").length;
  const positivePercent = totalProcessed ? Math.round((positiveCount / totalProcessed) * 100) : 0;
  const neutralPercent = totalProcessed ? Math.round((neutralCount / totalProcessed) * 100) : 0;
  const negativePercent = totalProcessed ? Math.round((negativeCount / totalProcessed) * 100) : 0;

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < count ? "text-amber-400 fill-amber-400" : "text-gray-300"}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 size={28} className="animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl w-full">
      {/* Page header */}
      <div>
        <h2 className="text-gray-900 text-base md:text-lg" style={{ fontWeight: 700 }}>
          Sentiment Analysis
        </h2>
        <p className="text-gray-500 text-xs md:text-sm mt-0.5">
          Upload customer reviews and analyze sentiment with AI
        </p>
      </div>

      {/* Zone 1: Upload Area */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="text-gray-700 text-xs md:text-sm mb-2 block" style={{ fontWeight: 600 }}>
              Upload Reviews CSV
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-8 text-center hover:border-violet-400 hover:bg-violet-50/30 transition-all cursor-pointer group">
              <Upload size={32} className="text-gray-400 group-hover:text-violet-500 mx-auto mb-2" />
              <p className="text-gray-700 text-sm mb-1" style={{ fontWeight: 600 }}>
                Drop CSV file here or click to browse
              </p>
              <p className="text-gray-500 text-xs">Up to 500 records supported</p>
            </div>
          </div>
          <button className="h-10 md:h-11 px-6 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700 transition-colors" style={{ fontWeight: 600 }}>
            Analyze Reviews
          </button>
        </div>
      </div>

      {/* Zone 2: AI Summary KPIs */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Average Rating */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 md:col-span-1">
            <p className="text-gray-500 text-xs mb-3">Average Rating</p>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-gray-900" style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>
                {avgRating}
              </p>
              <div className="flex gap-0.5">{renderStars(Math.round(parseFloat(avgRating)))}</div>
            </div>
            <p className="text-gray-400 text-xs">Based on {totalProcessed} reviews</p>
          </div>

          {/* Sentiment Split */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 md:col-span-1">
            <p className="text-gray-500 text-xs mb-3">Sentiment Distribution</p>

            {/* Stacked Bar Chart */}
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex mb-3">
              <div className="bg-emerald-500 h-full" style={{ width: `${positivePercent}%` }} />
              <div className="bg-amber-400 h-full" style={{ width: `${neutralPercent}%` }} />
              <div className="bg-red-500 h-full" style={{ width: `${negativePercent}%` }} />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <ThumbsUp size={12} className="text-emerald-500 flex-shrink-0" />
                <span className="text-gray-600">{positivePercent}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Meh size={12} className="text-amber-500 flex-shrink-0" />
                <span className="text-gray-600">{neutralPercent}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ThumbsDown size={12} className="text-red-500 flex-shrink-0" />
                <span className="text-gray-600">{negativePercent}%</span>
              </div>
            </div>
          </div>

          {/* Total Processed */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 md:col-span-1">
            <p className="text-gray-500 text-xs mb-3">Total Processed</p>
            <p className="text-gray-900 mb-2" style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>
              {totalProcessed}
            </p>
            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs" style={{ fontWeight: 600 }}>
              AI-Powered
            </div>
          </div>
        </div>
      )}

      {/* Zone 3: Prediction Data */}
      {hasData && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>
              Review Predictions
            </h3>
            <p className="text-gray-500 text-xs mt-0.5">AI-generated sentiment analysis results</p>
          </div>

          {/* Desktop: Data Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600" style={{ fontWeight: 600 }}>
                    Review Snippet
                  </th>
                  <th className="text-left px-4 py-3 text-gray-600" style={{ fontWeight: 600 }}>
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-gray-600" style={{ fontWeight: 600 }}>
                    Predicted Stars
                  </th>
                  <th className="text-left px-4 py-3 text-gray-600" style={{ fontWeight: 600 }}>
                    Sentiment
                  </th>
                  <th className="text-left px-4 py-3 text-gray-600" style={{ fontWeight: 600 }}>
                    Confidence %
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 max-w-xs">{review.original_text}</td>
                    <td className="px-4 py-3 text-gray-600">{review.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">{renderStars(review.ai_rating)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${sentimentColors[review.sentiment as keyof typeof sentimentColors]}`} style={{ fontWeight: 600 }}>
                        {review.sentiment}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-violet-600" style={{ fontWeight: 600 }}>
                        {Math.round(review.confidence * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Stacked Cards */}
          <div className="md:hidden">
            {reviews.map((review, index) => (
              <div key={index} className="px-4 py-4 border-b border-gray-100 last:border-0">
                {/* Top Row: Category + Sentiment Badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs">{review.category}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${sentimentColors[review.sentiment as keyof typeof sentimentColors]}`} style={{ fontWeight: 600 }}>
                    {review.sentiment}
                  </span>
                </div>

                {/* Middle Row: Review Snippet */}
                <p className="text-gray-700 text-xs mb-3 leading-relaxed">{review.original_text}</p>

                {/* Bottom Row: Stars + Confidence */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">{renderStars(review.ai_rating)}</div>
                  <span className="text-violet-600 text-xs" style={{ fontWeight: 600 }}>
                    Confidence: {Math.round(review.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
