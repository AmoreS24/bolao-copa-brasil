"use client";

import { useEffect, useState } from "react";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function calculateTimeLeft(startsAt: string): TimeLeft {
  const difference = new Date(startsAt).getTime() - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

function formatNumber(value: number) {
  return String(value).padStart(2, "0");
}

export function MatchCountdown({ startsAt }: { startsAt: string }) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setMounted(true);
    setTimeLeft(calculateTimeLeft(startsAt));

    const interval = window.setInterval(() => {
      setTimeLeft(calculateTimeLeft(startsAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [startsAt]);

  const values = mounted
    ? [
        { label: "DIAS", value: formatNumber(timeLeft.days) },
        { label: "HORAS", value: formatNumber(timeLeft.hours) },
        { label: "MINUTOS", value: formatNumber(timeLeft.minutes) },
        { label: "SEGUNDOS", value: formatNumber(timeLeft.seconds) },
      ]
    : [
        { label: "DIAS", value: "00" },
        { label: "HORAS", value: "00" },
        { label: "MINUTOS", value: "00" },
        { label: "SEGUNDOS", value: "00" },
      ];

  return (
    <div className="rounded-lg border border-white/20 bg-black/25 p-3 shadow-2xl backdrop-blur-md md:p-4">
      <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.25em] text-brasil-yellow">
        Contagem regressiva
      </p>

      <div className="grid grid-cols-4 gap-2">
        {values.map((item) => (
          <div
            key={item.label}
            className="rounded-lg bg-white px-2 py-2 text-center shadow-lg md:px-3"
          >
            <strong className="block text-2xl font-black leading-none text-brasil-blue drop-shadow-md md:text-3xl">
              {item.value}
            </strong>
            <span className="mt-1 block text-[9px] font-black uppercase tracking-wide text-slate-500 md:text-[10px]">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
