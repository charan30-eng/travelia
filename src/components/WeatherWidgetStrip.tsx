import React from 'react';
import { 
  CloudSun, 
  CloudRain, 
  Sun, 
  Wind, 
  Droplets, 
  AlertTriangle, 
  Sparkles, 
  ChevronRight, 
  ArrowRight,
  Info
} from 'lucide-react';
import { TripPlan, WeatherForecastDay } from '../types';
import { generateWeatherForecast } from '../data/featureData';

interface WeatherWidgetStripProps {
  trip: TripPlan;
  activeDay: number;
  onSelectDay: (day: number) => void;
  onTriggerWeatherReplan: (dayNumber: number) => void;
}

export const WeatherWidgetStrip: React.FC<WeatherWidgetStripProps> = ({
  trip,
  activeDay,
  onSelectDay,
  onTriggerWeatherReplan,
}) => {
  const forecasts = generateWeatherForecast(trip);
  const currentDayForecast = forecasts.find(f => f.dayNumber === activeDay) || forecasts[0];

  const getWeatherIcon = (condition: WeatherForecastDay['condition']) => {
    switch (condition) {
      case 'Sunny':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'Afternoon Showers':
      case 'Rainy':
        return <CloudRain className="w-5 h-5 text-sky-600" />;
      case 'Partly Cloudy':
        return <CloudSun className="w-5 h-5 text-neutral-600" />;
      case 'Clear Coastal':
        return <Sun className="w-5 h-5 text-amber-400" />;
      default:
        return <Wind className="w-5 h-5 text-teal-600" />;
    }
  };

  return (
    <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
      
      {/* Header with Title & Disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#344E27] text-white flex items-center justify-center shadow-xs">
              <CloudSun className="w-4 h-4 text-[#E5ECE0]" />
            </div>
            <h3 className="font-display font-extrabold text-xl text-[#191919]">
              Weather-Aware Trip Planning
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold">
              AI Forecast Engine
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Intelligent daily forecasts optimize indoor vs. outdoor scheduling and flag precipitation windows.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-semibold border border-neutral-200 self-start sm:self-auto">
          <Info className="w-3 h-3 text-neutral-400" />
          <span>Simulated Forecast Engine • Travelia Weather</span>
        </div>
      </div>

      {/* Daily Weather Cards Carousel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {forecasts.map(f => {
          const isSelected = activeDay === f.dayNumber;
          return (
            <div
              key={f.dayNumber}
              onClick={() => onSelectDay(f.dayNumber)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-[#F4F7F2] border-[#344E27] ring-1 ring-[#344E27] shadow-xs'
                  : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isSelected ? 'text-[#344E27]' : 'text-neutral-700'}`}>
                  {f.dateStr}
                </span>
                {getWeatherIcon(f.condition)}
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-[#191919]">{f.tempMaxC}°C</span>
                  <span className="text-xs text-neutral-400 font-semibold">{f.tempMinC}°</span>
                </div>
                <p className="text-[11px] font-bold text-neutral-700 mt-0.5">{f.condition}</p>
              </div>

              <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[10px] text-neutral-500 font-medium">
                <span className="flex items-center gap-1">
                  <Droplets className="w-2.5 h-2.5 text-sky-500" /> {f.rainChancePercent}% Rain
                </span>
                <span>UV {f.uvIndex}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Day Weather Advisory & Quick Replan Trigger */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F9FBF8] border border-[#D8E4D3] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-[#344E27] uppercase tracking-wider">
              Day 0{currentDayForecast.dayNumber} AI Weather Recommendation
            </span>
            <span className="text-xs text-neutral-500 font-medium">
              • {currentDayForecast.recommendedTime}
            </span>
          </div>
          <p className="text-xs text-neutral-800 font-medium leading-relaxed">
            {currentDayForecast.aiAdvisory}
          </p>
        </div>

        {currentDayForecast.isRainAlert ? (
          <button
            onClick={() => onTriggerWeatherReplan(currentDayForecast.dayNumber)}
            className="px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
            <span>Replan for Rain on Day {currentDayForecast.dayNumber}</span>
          </button>
        ) : (
          <button
            onClick={() => onTriggerWeatherReplan(currentDayForecast.dayNumber)}
            className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#344E27]" />
            <span>Optimize for Weather</span>
          </button>
        )}
      </div>

    </div>
  );
};
