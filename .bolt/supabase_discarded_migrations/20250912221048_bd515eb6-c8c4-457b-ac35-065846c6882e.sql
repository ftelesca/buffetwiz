-- Criar tabelas para o sistema Wizard
CREATE TABLE public.wizard_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.wizard_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.wizard_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.wizard_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query_hash TEXT NOT NULL,
  response_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.wizard_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wizard_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wizard_cache ENABLE ROW LEVEL SECURITY;

-- Políticas para wizard_chats
CREATE POLICY "Users can view their own chats" 
ON public.wizard_chats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chats" 
ON public.wizard_chats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" 
ON public.wizard_chats 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" 
ON public.wizard_chats 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para wizard_messages
CREATE POLICY "Users can view messages from their chats" 
ON public.wizard_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.wizard_chats 
  WHERE wizard_chats.id = wizard_messages.chat_id 
  AND wizard_chats.user_id = auth.uid()
));

CREATE POLICY "Users can create messages in their chats" 
ON public.wizard_messages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.wizard_chats 
  WHERE wizard_chats.id = wizard_messages.chat_id 
  AND wizard_chats.user_id = auth.uid()
));

CREATE POLICY "Users can update messages in their chats" 
ON public.wizard_messages 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.wizard_chats 
  WHERE wizard_chats.id = wizard_messages.chat_id 
  AND wizard_chats.user_id = auth.uid()
));

CREATE POLICY "Users can delete messages from their chats" 
ON public.wizard_messages 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.wizard_chats 
  WHERE wizard_chats.id = wizard_messages.chat_id 
  AND wizard_chats.user_id = auth.uid()
));

-- Políticas para wizard_cache
CREATE POLICY "Users can view their own cache" 
ON public.wizard_cache 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cache" 
ON public.wizard_cache 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cache" 
ON public.wizard_cache 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cache" 
ON public.wizard_cache 
FOR DELETE 
USING (auth.uid() = user_id);

-- Criar índices para performance
CREATE INDEX idx_wizard_chats_user_id ON public.wizard_chats(user_id);
CREATE INDEX idx_wizard_chats_created_at ON public.wizard_chats(created_at DESC);
CREATE INDEX idx_wizard_messages_chat_id ON public.wizard_messages(chat_id);
CREATE INDEX idx_wizard_messages_created_at ON public.wizard_messages(created_at);
CREATE INDEX idx_wizard_cache_user_id ON public.wizard_cache(user_id);
CREATE INDEX idx_wizard_cache_query_hash ON public.wizard_cache(query_hash);
CREATE INDEX idx_wizard_cache_expires_at ON public.wizard_cache(expires_at);

-- Trigger para auto-update do timestamp
CREATE OR REPLACE FUNCTION public.update_wizard_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_wizard_chats_updated_at
  BEFORE UPDATE ON public.wizard_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wizard_chats_updated_at();

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION public.cleanup_expired_wizard_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.wizard_cache 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SET search_path = public;