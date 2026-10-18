import React from 'react';
import {
  CalendarDays,
  BookMarked,
  Armchair,
  Users,
  MoreHorizontal,
} from 'lucide-react';

interface AmicaBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const AmicaBottomNav: React.FC<AmicaBottomNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const navTabs = [
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'bookings', label: 'Bookings', icon: BookMarked },
    { id: 'spaces', label: 'Spaces', icon: Armchair },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDE7DF] shadow-lg max-w-md md:max-w-xl mx-auto">
      <div className="flex items-center justify-around h-16 px-2">
        {navTabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer relative ${
                isActive ? 'text-[#780C1E]' : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              <div className="relative">
                <IconComponent
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#780C1E]" />
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 transition-colors ${
                  isActive ? 'font-bold text-[#780C1E]' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
