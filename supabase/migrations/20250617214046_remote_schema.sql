create extension if not exists "insert_username" with schema "extensions";


create type "public"."estado" as enum ('Aprobado', 'Pendiente', 'Rechazado');

create type "public"."user_role" as enum ('user', 'admin');

create sequence "public"."expenses_id_rend_seq";

create table "public"."attachments" (
    "id" uuid not null default gen_random_uuid(),
    "file_name" text not null,
    "file_type" text not null,
    "file_size" numeric not null,
    "created_at" timestamp with time zone default now(),
    "post_id" uuid,
    "comment_id" uuid,
    "user_id" uuid not null,
    "file_url" text,
    "file_path" text
);


alter table "public"."attachments" enable row level security;

create table "public"."comments" (
    "id" uuid not null default gen_random_uuid(),
    "content" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "user_id" uuid not null,
    "post_id" uuid not null
);


alter table "public"."comments" enable row level security;

create table "public"."posts" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "content" jsonb,
    "excerpt" text,
    "slug" text,
    "published" boolean default false,
    "created_at" timestamp with time zone default (now() AT TIME ZONE 'utc'::text),
    "updated_at" timestamp with time zone,
    "user_id" uuid not null,
    "fecha" date
);


alter table "public"."posts" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "username" text not null,
    "display_name" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "role" user_role not null default 'user'::user_role
);


alter table "public"."profiles" enable row level security;

CREATE UNIQUE INDEX attachments_pkey ON public.attachments USING btree (id);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE UNIQUE INDEX posts_pkey ON public.posts USING btree (id);

CREATE UNIQUE INDEX posts_slug_key ON public.posts USING btree (slug);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

alter table "public"."attachments" add constraint "attachments_pkey" PRIMARY KEY using index "attachments_pkey";

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."posts" add constraint "posts_pkey" PRIMARY KEY using index "posts_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."attachments" add constraint "attachment_belongs_to_entity" CHECK ((((post_id IS NOT NULL) AND (comment_id IS NULL)) OR ((post_id IS NULL) AND (comment_id IS NOT NULL)))) not valid;

alter table "public"."attachments" validate constraint "attachment_belongs_to_entity";

alter table "public"."attachments" add constraint "fk_attachments_comment" FOREIGN KEY (comment_id) REFERENCES comments(id) not valid;

alter table "public"."attachments" validate constraint "fk_attachments_comment";

alter table "public"."attachments" add constraint "fk_attachments_post" FOREIGN KEY (post_id) REFERENCES posts(id) not valid;

alter table "public"."attachments" validate constraint "fk_attachments_post";

alter table "public"."attachments" add constraint "fk_attachments_user" FOREIGN KEY (user_id) REFERENCES profiles(id) not valid;

alter table "public"."attachments" validate constraint "fk_attachments_user";

alter table "public"."comments" add constraint "fk_comments_post" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "fk_comments_post";

alter table "public"."comments" add constraint "fk_comments_user" FOREIGN KEY (user_id) REFERENCES profiles(id) not valid;

alter table "public"."comments" validate constraint "fk_comments_user";

alter table "public"."posts" add constraint "fk_posts_user" FOREIGN KEY (user_id) REFERENCES profiles(id) not valid;

alter table "public"."posts" validate constraint "fk_posts_user";

alter table "public"."posts" add constraint "posts_slug_key" UNIQUE using index "posts_slug_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$BEGIN
END;$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1), NULL);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_admin_role(user_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  user_id uuid;
begin
  -- Get the user id from auth.users
  select id into user_id
  from auth.users
  where email = user_email;

  -- Update the role in profiles table
  update public.profiles
  set role = 'admin'
  where id = user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."attachments" to "anon";

grant insert on table "public"."attachments" to "anon";

grant references on table "public"."attachments" to "anon";

grant select on table "public"."attachments" to "anon";

grant trigger on table "public"."attachments" to "anon";

grant truncate on table "public"."attachments" to "anon";

grant update on table "public"."attachments" to "anon";

grant delete on table "public"."attachments" to "authenticated";

grant insert on table "public"."attachments" to "authenticated";

grant references on table "public"."attachments" to "authenticated";

grant select on table "public"."attachments" to "authenticated";

grant trigger on table "public"."attachments" to "authenticated";

grant truncate on table "public"."attachments" to "authenticated";

grant update on table "public"."attachments" to "authenticated";

grant delete on table "public"."attachments" to "service_role";

grant insert on table "public"."attachments" to "service_role";

grant references on table "public"."attachments" to "service_role";

grant select on table "public"."attachments" to "service_role";

grant trigger on table "public"."attachments" to "service_role";

grant truncate on table "public"."attachments" to "service_role";

grant update on table "public"."attachments" to "service_role";

grant delete on table "public"."comments" to "anon";

grant insert on table "public"."comments" to "anon";

grant references on table "public"."comments" to "anon";

grant select on table "public"."comments" to "anon";

grant trigger on table "public"."comments" to "anon";

grant truncate on table "public"."comments" to "anon";

grant update on table "public"."comments" to "anon";

grant delete on table "public"."comments" to "authenticated";

grant insert on table "public"."comments" to "authenticated";

grant references on table "public"."comments" to "authenticated";

grant select on table "public"."comments" to "authenticated";

grant trigger on table "public"."comments" to "authenticated";

grant truncate on table "public"."comments" to "authenticated";

grant update on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";

grant insert on table "public"."comments" to "service_role";

grant references on table "public"."comments" to "service_role";

grant select on table "public"."comments" to "service_role";

grant trigger on table "public"."comments" to "service_role";

grant truncate on table "public"."comments" to "service_role";

grant update on table "public"."comments" to "service_role";

grant delete on table "public"."posts" to "anon";

grant insert on table "public"."posts" to "anon";

grant references on table "public"."posts" to "anon";

grant select on table "public"."posts" to "anon";

grant trigger on table "public"."posts" to "anon";

grant truncate on table "public"."posts" to "anon";

grant update on table "public"."posts" to "anon";

grant delete on table "public"."posts" to "authenticated";

grant insert on table "public"."posts" to "authenticated";

grant references on table "public"."posts" to "authenticated";

grant select on table "public"."posts" to "authenticated";

grant trigger on table "public"."posts" to "authenticated";

grant truncate on table "public"."posts" to "authenticated";

grant update on table "public"."posts" to "authenticated";

grant delete on table "public"."posts" to "service_role";

grant insert on table "public"."posts" to "service_role";

grant references on table "public"."posts" to "service_role";

grant select on table "public"."posts" to "service_role";

grant trigger on table "public"."posts" to "service_role";

grant truncate on table "public"."posts" to "service_role";

grant update on table "public"."posts" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

create policy "Enable insert for authenticated users only"
on "public"."attachments"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable insert for users based on user_id"
on "public"."attachments"
as permissive
for insert
to public
with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can manage their own attachments"
on "public"."attachments"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "Users can view attachments on published posts"
on "public"."attachments"
as permissive
for select
to public
using ((((post_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM posts
  WHERE ((posts.id = attachments.post_id) AND ((posts.published = true) OR (posts.user_id = auth.uid())))))) OR ((comment_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM comments
  WHERE (comments.id = attachments.comment_id)))) OR (user_id = auth.uid())));


create policy "Admins can do anything with comments"
on "public"."comments"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));


create policy "Public can view comments"
on "public"."comments"
as permissive
for select
to public
using (true);


create policy "Users can add comments to any post"
on "public"."comments"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can delete own comments"
on "public"."comments"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "Users can manage their own comments"
on "public"."comments"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "Users can read all comments"
on "public"."comments"
as permissive
for select
to authenticated
using (true);


create policy "Users can update own comments"
on "public"."comments"
as permissive
for update
to authenticated
using ((auth.uid() = user_id));


create policy "Admins can do anything"
on "public"."posts"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));


create policy "Public can view published posts"
on "public"."posts"
as permissive
for select
to public
using ((published = true));


create policy "Users can delete own posts"
on "public"."posts"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "Users can manage their own posts"
on "public"."posts"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "Users can read all posts"
on "public"."posts"
as permissive
for select
to authenticated
using (true);


create policy "Users can update own posts"
on "public"."posts"
as permissive
for update
to authenticated
using ((auth.uid() = user_id));


create policy "Enable insert for users only"
on "public"."profiles"
as permissive
for insert
to public
with check (true);


create policy "Public can view profiles"
on "public"."profiles"
as permissive
for select
to public
using (true);


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for all
to authenticated
using ((auth.uid() = id));



