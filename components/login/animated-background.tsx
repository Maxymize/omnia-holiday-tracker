'use client';

export function AnimatedBackground({ className = "" }: { className?: string }) {

  return (
    <>
      {/* Custom CSS for elegant animations */}
      <style jsx>{`
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-15px) rotate(1deg); opacity: 0.5; }
        }
        
        @keyframes softPulse {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.2; }
          50% { transform: scale(1.05) rotate(2deg); opacity: 0.4; }
        }
        
        @keyframes etherealDrift {
          0% { transform: translateX(0px) translateY(0px) rotate(0deg); opacity: 0.15; }
          33% { transform: translateX(10px) translateY(-8px) rotate(1deg); opacity: 0.25; }
          66% { transform: translateX(-5px) translateY(-12px) rotate(-1deg); opacity: 0.35; }
          100% { transform: translateX(0px) translateY(0px) rotate(0deg); opacity: 0.15; }
        }
        
        @keyframes subtleGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 146, 60, 0.1); opacity: 0.2; }
          50% { box-shadow: 0 0 40px rgba(251, 146, 60, 0.2); opacity: 0.4; }
        }
        
        @keyframes minimalistRotate {
          0% { transform: rotate(0deg) scale(1); }
          100% { transform: rotate(360deg) scale(1.02); }
        }
        
        .gentle-float {
          animation: gentleFloat 25s ease-in-out infinite;
        }
        
        .soft-pulse {
          animation: softPulse 30s ease-in-out infinite;
        }
        
        .ethereal-drift {
          animation: etherealDrift 35s ease-in-out infinite;
        }
        
        .subtle-glow {
          animation: subtleGlow 20s ease-in-out infinite;
        }
        
        .minimalist-rotate {
          animation: minimalistRotate 120s linear infinite;
        }
      `}</style>
      
      <div 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          zIndex: 1,
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #fef3e2 70%, #fed7aa 100%)',
          overflow: 'hidden'
        }}
        className={className}
      >
        {/* Large subtle geometric shape - top left */}
        <div 
          className="gentle-float"
          style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            background: 'linear-gradient(45deg, rgba(148, 163, 184, 0.08), rgba(156, 163, 175, 0.12))',
            top: '-50px',
            left: '-50px',
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            animationDelay: '0s'
          }}
        />
        
        {/* Medium hexagonal shape - center right */}
        <div 
          className="soft-pulse"
          style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            background: 'rgba(251, 146, 60, 0.06)',
            top: '30%',
            right: '-30px',
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            animationDelay: '5s'
          }}
        />
        
        {/* Small elegant circle - bottom left */}
        <div 
          className="ethereal-drift"
          style={{
            position: 'absolute',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(100, 116, 139, 0.1), rgba(148, 163, 184, 0.05))',
            bottom: '10%',
            left: '5%',
            borderRadius: '50%',
            animationDelay: '10s'
          }}
        />
        
        {/* Subtle diamond shape - top center */}
        <div 
          className="minimalist-rotate"
          style={{
            position: 'absolute',
            width: '100px',
            height: '100px',
            background: 'rgba(248, 250, 252, 0.15)',
            top: '15%',
            left: '45%',
            transform: 'rotate(45deg)',
            border: '1px solid rgba(156, 163, 175, 0.1)',
            animationDelay: '15s'
          }}
        />
        
        {/* Large organic shape - bottom right */}
        <div 
          className="gentle-float"
          style={{
            position: 'absolute',
            width: '250px',
            height: '180px',
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.04), rgba(251, 146, 60, 0.08))',
            bottom: '-20px',
            right: '-40px',
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
            animationDelay: '8s'
          }}
        />
        
        {/* Minimal accent line - left side */}
        <div 
          className="ethereal-drift"
          style={{
            position: 'absolute',
            width: '2px',
            height: '200px',
            background: 'linear-gradient(180deg, transparent, rgba(156, 163, 175, 0.2), transparent)',
            top: '20%',
            left: '15%',
            borderRadius: '1px',
            animationDelay: '12s'
          }}
        />
        
        {/* Glowing accent dot - center */}
        <div 
          className="subtle-glow"
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            background: 'rgba(251, 146, 60, 0.3)',
            top: '50%',
            left: '70%',
            borderRadius: '50%',
            animationDelay: '18s'
          }}
        />
        
        {/* Ultra-subtle background texture overlay */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `radial-gradient(circle at 20% 80%, rgba(148, 163, 184, 0.03) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(251, 146, 60, 0.02) 0%, transparent 50%),
                        radial-gradient(circle at 40% 40%, rgba(156, 163, 175, 0.02) 0%, transparent 50%)`,
            pointerEvents: 'none'
          }}
        />
      </div>
    </>
  );
}