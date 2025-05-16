// Tipos compartidos entre client y server actions
import { Database } from "@/types/supabase";

export type Attachment = Database["public"]["Tables"]["attachments"]["Row"];

export type Comment = Database["public"]["Tables"]["comments"]["Row"] & {
    profiles: Database["public"]["Tables"]["profiles"]["Row"] | null;
    attachments: Database["public"]["Tables"]["attachments"]["Row"][];
};

export type Post = Database["public"]["Tables"]["posts"]["Row"] & {
  profiles?: Database["public"]["Tables"]["profiles"]["Row"] | null;
  attachments?: Database["public"]["Tables"]["attachments"]["Row"][];
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
