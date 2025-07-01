export function Footer() {
  return (
    <footer className="border-t py-6 w-full mt-auto">
      <div className="container flex flex-col items-center justify-center gap-4 md:h-16">
        <p className="text-center text-sm leading-loose text-muted-foreground">
          Desarrollado con Next.js, Supabase, y shadcn/ui para KLV.
        </p>
      </div>
    </footer>
  );
}