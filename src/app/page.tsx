import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PenSquare, BookOpen, MessageSquare, Users } from "lucide-react";
import { getPostsLimit } from "@/lib/actions/post.client";

export default async function Home() {
  try {
    
    const latestPosts = await getPostsLimit(3);
    return (
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        {/* Hero section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                  Comparte tus proyectos
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Una plataforma donde puedes crear, compartir y discutir ideas sobre las Obras en Ejecucion de construcción a través de contenido detallado y conversaciones significativas.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild size="lg">
                  <Link href="/blog" >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Explorar Proyectos
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/blog" >
                    <PenSquare className="mr-2 h-4 w-4" />
                    Compartir Proyecto
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        {/* Features section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <PenSquare className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Editor de Contenido Avanzado</h3>
                  <p className="text-muted-foreground">
                    Crea publicaciones detalladas con nuestro editor intuitivo. Da formato al texto, añade imágenes, planos y más.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Discusiones Técnicas</h3>
                  <p className="text-muted-foreground">
                    Participa en discusiones técnicas detalladas. Adjunta archivos, comparte especificaciones y mantén conversaciones profesionales.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Perfiles Profesionales</h3>
                  <p className="text-muted-foreground">
                    Construye tu presencia profesional con perfiles personalizables. Muestra tus proyectos y seguimiento de contribuciones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Latest posts section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Últimos Post
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground">
                  Descubre los últimos post.
                </p>
              </div>
            </div>
            
            <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
              {latestPosts && latestPosts.length > 0 ? (
                latestPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug || post.id}`}
                    className="group flex flex-col overflow-hidden rounded-lg border bg-background transition-colors hover:bg-accent/30"
                    >
                    <div className="flex flex-col space-y-2 p-6">
                      <h3 className="text-xl font-bold">{post.title}</h3>
                      {post.excerpt && (
                        <p className="line-clamp-2 text-muted-foreground">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                          <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-medium">
                            {(post.profiles?.display_name || post.profiles?.username || "User")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">
                            {post.profiles?.display_name || post.profiles?.username || "Anonymous"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-3 text-center py-12">
                  <p className="text-muted-foreground">Aún no hay proyectos publicados. 
                    ¡Sé el primero en compartir uno!</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-center mt-8">
              <Button asChild variant="outline">
                <Link href="/blog">
                  Ver todos los proyectos
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    console.error('Error al cargar los posts más recientes:', error);
    return (
      <div className="container mx-auto px-4">
        <h1>Lo sentimos, hubo un error al cargar los proyectos</h1>
      </div>
    );
  }
}