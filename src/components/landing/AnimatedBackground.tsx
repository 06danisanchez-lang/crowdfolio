export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Main gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      
      {/* Floating orbs */}
      <div 
        className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-float"
        style={{ animationDelay: '0s' }}
      />
      <div 
        className="absolute top-40 right-20 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl animate-float-slow"
        style={{ animationDelay: '2s' }}
      />
      <div 
        className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl animate-float"
        style={{ animationDelay: '4s' }}
      />
      <div 
        className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl animate-float-slow"
        style={{ animationDelay: '1s' }}
      />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
