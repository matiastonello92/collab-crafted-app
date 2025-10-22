-- =====================================================
-- FASE 1: Schema Bacheca Sociale (Posts System)
-- =====================================================

-- Tabella principale: posts
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Contenuto
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 5000),
  media_urls JSONB DEFAULT '[]'::jsonb,
  
  -- Visibilità e scope
  visibility TEXT NOT NULL DEFAULT 'location' CHECK (visibility IN ('location', 'organization')),
  allowed_locations UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Engagement (denormalizzati per performance)
  likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
  comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0),
  shares_count INTEGER DEFAULT 0 CHECK (shares_count >= 0),
  
  -- Metadata
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_posts_org_location ON public.posts(org_id, location_id) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON public.posts(visibility) WHERE is_archived = false;

-- Tabella: post_mentions
CREATE TABLE IF NOT EXISTS public.post_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentioned_org_id UUID REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  CONSTRAINT mention_type_check CHECK (
    (mentioned_user_id IS NOT NULL AND mentioned_org_id IS NULL) OR
    (mentioned_user_id IS NULL AND mentioned_org_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_post_mentions_post ON public.post_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_user ON public.post_mentions(mentioned_user_id) WHERE mentioned_user_id IS NOT NULL;

-- Tabella: post_likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);

-- Tabella: post_comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  
  likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON public.post_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_post_comments_author ON public.post_comments(author_id);

-- Tabella: post_shares
CREATE TABLE IF NOT EXISTS public.post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  
  share_comment TEXT CHECK (share_comment IS NULL OR length(share_comment) <= 500),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(original_post_id, shared_by_user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_shares_original ON public.post_shares(original_post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user ON public.post_shares(shared_by_user_id);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- =====================================================
-- TRIGGER: Update engagement counters
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts 
  SET likes_count = (
    SELECT COUNT(*) FROM public.post_likes WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
  )
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_post_likes_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_likes_count();

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts 
  SET comments_count = (
    SELECT COUNT(*) FROM public.post_comments WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
  )
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_post_comments_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();

CREATE OR REPLACE FUNCTION public.update_post_shares_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts 
  SET shares_count = (
    SELECT COUNT(*) FROM public.post_shares WHERE original_post_id = COALESCE(NEW.original_post_id, OLD.original_post_id)
  )
  WHERE id = COALESCE(NEW.original_post_id, OLD.original_post_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_post_shares_count
AFTER INSERT OR DELETE ON public.post_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_post_shares_count();

-- =====================================================
-- ROW LEVEL SECURITY: Enable RLS
-- =====================================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: posts
-- =====================================================

-- SELECT: Vedo post della mia org nelle mie location
CREATE POLICY "posts_select" ON public.posts
FOR SELECT
USING (
  is_platform_admin() OR (
    user_in_org(org_id) AND
    (
      -- Post location-specific: devo avere accesso a quella location
      (location_id IS NOT NULL AND user_in_location(location_id)) OR
      -- Post org-wide: qualsiasi location va bene
      (location_id IS NULL) OR
      -- Post cross-location: sono in una delle location permesse
      (allowed_locations && ARRAY(
        SELECT url.location_id::uuid 
        FROM user_roles_locations url 
        WHERE url.user_id = auth.uid() AND url.org_id = posts.org_id
      ))
    ) AND
    is_archived = false
  )
);

-- INSERT: Solo nella mia org e location
CREATE POLICY "posts_insert" ON public.posts
FOR INSERT
WITH CHECK (
  user_in_org(org_id) AND
  (location_id IS NULL OR user_in_location(location_id)) AND
  author_id = auth.uid() AND
  user_has_permission(auth.uid(), 'posts:create')
);

-- UPDATE: Solo i miei post o se ho permessi di moderazione
CREATE POLICY "posts_update" ON public.posts
FOR UPDATE
USING (
  is_platform_admin() OR
  author_id = auth.uid() OR
  (user_in_org(org_id) AND user_has_permission(auth.uid(), 'posts:moderate'))
);

-- DELETE: Solo i miei post o se ho permessi di moderazione
CREATE POLICY "posts_delete" ON public.posts
FOR DELETE
USING (
  is_platform_admin() OR
  author_id = auth.uid() OR
  (user_in_org(org_id) AND user_has_permission(auth.uid(), 'posts:moderate'))
);

-- =====================================================
-- RLS POLICIES: post_mentions
-- =====================================================

-- SELECT: Vedo menzioni nei post che posso vedere
CREATE POLICY "mentions_select" ON public.post_mentions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_mentions.post_id
  )
);

-- INSERT: Posso menzionare solo utenti della mia org
CREATE POLICY "mentions_insert" ON public.post_mentions
FOR INSERT
WITH CHECK (
  user_in_org(org_id) AND
  EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_id AND p.author_id = auth.uid()
  ) AND
  (
    -- Menzione utente: deve essere nella mia org
    (mentioned_user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles prof 
      WHERE prof.id = mentioned_user_id AND prof.org_id = org_id
    )) OR
    -- Menzione org: deve essere la mia org
    (mentioned_org_id IS NOT NULL AND mentioned_org_id = org_id)
  )
);

-- DELETE: Solo l'autore del post può rimuovere menzioni
CREATE POLICY "mentions_delete" ON public.post_mentions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_id AND p.author_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES: post_likes
-- =====================================================

-- SELECT: Vedo like sui post che posso vedere
CREATE POLICY "likes_select" ON public.post_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_likes.post_id
  )
);

-- INSERT: Posso likare post della mia org
CREATE POLICY "likes_insert" ON public.post_likes
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  user_in_org(org_id) AND
  EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_id
  ) AND
  user_has_permission(auth.uid(), 'posts:like')
);

-- DELETE: Posso rimuovere solo i miei like
CREATE POLICY "likes_delete" ON public.post_likes
FOR DELETE
USING (
  user_id = auth.uid()
);

-- =====================================================
-- RLS POLICIES: post_comments
-- =====================================================

-- SELECT: Vedo commenti sui post che posso vedere
CREATE POLICY "comments_select" ON public.post_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_comments.post_id
  )
);

-- INSERT: Posso commentare post della mia org
CREATE POLICY "comments_insert" ON public.post_comments
FOR INSERT
WITH CHECK (
  author_id = auth.uid() AND
  user_in_org(org_id) AND
  EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_id
  ) AND
  user_has_permission(auth.uid(), 'posts:comment')
);

-- UPDATE: Posso modificare solo i miei commenti
CREATE POLICY "comments_update" ON public.post_comments
FOR UPDATE
USING (
  author_id = auth.uid() OR
  (user_in_org(org_id) AND user_has_permission(auth.uid(), 'posts:moderate'))
);

-- DELETE: Posso eliminare i miei commenti o se sono moderatore
CREATE POLICY "comments_delete" ON public.post_comments
FOR DELETE
USING (
  author_id = auth.uid() OR
  (user_in_org(org_id) AND user_has_permission(auth.uid(), 'posts:moderate'))
);

-- =====================================================
-- RLS POLICIES: post_shares
-- =====================================================

-- SELECT: Vedo share sui post che posso vedere
CREATE POLICY "shares_select" ON public.post_shares
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_shares.original_post_id
  )
);

-- INSERT: Posso condividere post della mia org
CREATE POLICY "shares_insert" ON public.post_shares
FOR INSERT
WITH CHECK (
  shared_by_user_id = auth.uid() AND
  user_in_org(org_id) AND
  EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = original_post_id
  ) AND
  user_has_permission(auth.uid(), 'posts:share')
);

-- DELETE: Posso eliminare solo le mie condivisioni
CREATE POLICY "shares_delete" ON public.post_shares
FOR DELETE
USING (
  shared_by_user_id = auth.uid()
);