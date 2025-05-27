'use client';
import Link from "next/link";
import { getPublishedPosts } from "@/lib/actions/post.client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import React, { useEffect, useState } from "react";
import { MessageSquareText, Search } from "lucide-react";

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getPublishedPosts();
        setPosts(data);
      } catch (err) {
        setError("Error al cargar los posts");
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // Filtro dinámico por title y excerpt
  const filteredPosts = posts.filter((post) => {
    const term = searchTerm.toLowerCase();
    return (
      post.title?.toLowerCase().includes(term) ||
      post.excerpt?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
       {/* <p className="text-muted-foreground">Cargando posts...</p> */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1>{error}</h1>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Todos los Posts</h1>
        <form className="relative w-64" onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            placeholder="Filtrar"
            className="border rounded-md px-3 py-2 pr-10 w-full focus:outline-none focus:ring-2 focus:ring-accent bg-background text-base"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {/* <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-accent-foreground hover:text-accent"
            aria-label="Buscar"
            tabIndex={-1}
          >
            <Search className="w-5 h-5" />
          </button> */}
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPosts && filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug || post.id}`}
              className="group flex flex-col overflow-hidden rounded-lg border bg-background transition-colors hover:bg-accent/30"
            >
              <div className="flex flex-col space-y-2 p-6">
                <h2 className="text-xl font-bold">{post.title}</h2>
                {post.excerpt && (
                  <p className="line-clamp-2 text-muted-foreground">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {(post.profiles?.display_name)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">
                      {post.profiles?.display_name}
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
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">
              No posts yet. Be the first to create one!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
