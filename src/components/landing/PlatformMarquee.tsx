const platforms = [
  'Urbanitae',
  'Housers',
  'Estateguru',
  'Crowdcube',
  'Brickstarter',
  'WeCity',
  'Civislend',
  'Recrea',
  'Wefunder',
  'Seedrs',
];

export default function PlatformMarquee() {
  // Duplicate the list for seamless loop
  const duplicatedPlatforms = [...platforms, ...platforms];

  return (
    <section className="border-y bg-muted/30 py-8 overflow-hidden">
      <div className="container mx-auto px-4">
        <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
          Compatible con las principales plataformas de crowdfunding
        </p>
      </div>
      
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-muted/30 to-transparent" />
        <div className="absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-muted/30 to-transparent" />
        
        {/* Marquee */}
        <div className="flex animate-marquee">
          {duplicatedPlatforms.map((platform, index) => (
            <span
              key={`${platform}-${index}`}
              className="mx-6 shrink-0 rounded-full bg-background px-5 py-2.5 text-sm font-medium shadow-sm transition-all duration-300 hover:shadow-md hover:text-primary cursor-default text-muted-foreground whitespace-nowrap"
            >
              {platform}
            </span>
          ))}
        </div>
      </div>
      
      <div className="container mx-auto mt-4 px-4 text-center">
        <span className="inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          + cualquier otra plataforma
        </span>
      </div>
    </section>
  );
}
