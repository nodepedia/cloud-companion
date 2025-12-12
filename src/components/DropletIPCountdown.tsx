import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface DropletIPCountdownProps {
  ipAddress: string | null;
  createdAt: string;
  onCopyIP: (ip: string) => void;
}

const COUNTDOWN_DURATION = 3 * 60 * 1000; // 3 minutes in milliseconds

const DropletIPCountdown = ({ ipAddress, createdAt, onCopyIP }: DropletIPCountdownProps) => {
  const [remainingTime, setRemainingTime] = useState<number>(0);

  useEffect(() => {
    const createdTime = new Date(createdAt).getTime();
    const now = Date.now();
    const elapsed = now - createdTime;
    const remaining = Math.max(0, COUNTDOWN_DURATION - elapsed);
    
    setRemainingTime(remaining);

    if (remaining > 0) {
      const interval = setInterval(() => {
        const newRemaining = Math.max(0, COUNTDOWN_DURATION - (Date.now() - createdTime));
        setRemainingTime(newRemaining);
        
        if (newRemaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [createdAt]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Still in countdown period
  if (remainingTime > 0) {
    return (
      <div className="flex items-center gap-2 text-warning">
        <Clock className="w-3 h-3 animate-pulse" />
        <span className="text-sm font-medium">
          Siap dalam {formatTime(remainingTime)}
        </span>
      </div>
    );
  }

  // Countdown finished, show IP or pending
  if (ipAddress) {
    return (
      <button 
        onClick={() => onCopyIP(ipAddress)}
        className="font-medium font-mono hover:text-primary transition-colors"
      >
        {ipAddress}
      </button>
    );
  }

  return <span className="text-muted-foreground italic">Pending...</span>;
};

export default DropletIPCountdown;
