//type para el content del Post y del Comment
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attachments: {
        Row: {
          id: string
          file_name: string
          file_path: string
          file_type: string
          file_size: number
          file_url: string
          created_at: string
          post_id: string | null
          comment_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          file_name: string
          file_type: string
          file_size: number
          file_url: string
          file_path: string
          created_at?: string
          post_id?: string | null
          comment_id?: string | null
          user_id?: string
        }
        Update: {
          id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          file_url?: string
          file_path: string
          created_at?: string
          post_id?: string | null
          comment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          id: string
          content: Json
          created_at: string
          user_id: string
          post_id: string
        }
        Insert: {
          id?: string
          content?: Json
          created_at?: string
          user_id: string
          post_id: string
        }
        Update: {
          id?: string
          content?: Json
          created_at?: string
          user_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      posts: {
        Row: {
          id: string
          title: string
          fecha: string | null
          content: Json
          excerpt: string | null
          slug: string | null
          published: boolean | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          title: string
          fecha: string | null
          content?: Json
          excerpt?: string | null
          slug?: string | null
          published?: boolean | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          title?: string
          fecha: string | null
          content?: Json
          excerpt?: string | null
          slug?: string | null
          published?: boolean | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
  }
}

export type Attachment = Database["public"]["Tables"]["attachments"]["Row"];

export type AttachmentInsert = Database["public"]["Tables"]["attachments"]["Insert"];

export type Comment = Database["public"]["Tables"]["comments"]["Row"] & {
    profiles?: Database["public"]["Tables"]["profiles"]["Row"] | null;
    attachments?: Database["public"]["Tables"]["attachments"]["Row"][];
};

export type Post = Database["public"]["Tables"]["posts"]["Row"] & {
  profiles?: Database["public"]["Tables"]["profiles"]["Row"] | null;
  attachments?: Database["public"]["Tables"]["attachments"]["Row"][];
};

export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];

export type PostUpdate = Database["public"]["Tables"]["posts"]["Update"];

//

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];




// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
export const TYPES_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
].join(",");